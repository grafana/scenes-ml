import { cloneDeep } from "lodash";
import { forkJoin, map, ReplaySubject, Unsubscribable } from "rxjs";

import { DataQueryRequest, DataSourceApi, LoadingState, PanelData, rangeUtil } from "@grafana/data";
// TODO: Remove this ignore annotation when the grafana runtime dependency has been updated
// @ts-ignore
import { getRunRequest, isExpressionReference, toDataQueryError } from "@grafana/runtime";
import { SceneQueryRunner, SceneTimeRangeLike, registerQueryWithController, sceneGraph } from "@grafana/scenes";
import { emptyPanelData } from "@grafana/scenes/src/core/SceneDataNode";
import { getClosest } from "@grafana/scenes/src/core/sceneGraph/utils";
import { getEnrichedDataRequest } from "@grafana/scenes/src/querying/getEnrichedDataRequest";
import { DataQueryExtended, findFirstDatasource, getNextRequestId } from "@grafana/scenes/src/querying/SceneQueryRunner";
import { getDataSource } from "@grafana/scenes/src/utils/getDataSource";
import { writeSceneLog } from "@grafana/scenes/src/utils/writeSceneLog";

import { SceneQueryProcessor, isQueryProcessor } from "./SceneQueryProcessor";
import { ProcessorFunc, SceneRequestSupplementer, isRequestAdder } from "./SceneRequestSupplementer";
import { timeShiftQueryProcessor } from "./timeShiftQueryProcessor";

interface Processors {
  primary: (data: PanelData) => PanelData;
  secondaries: Map<string, ProcessorFunc>;
}

export class SceneMLQueryRunner extends SceneQueryRunner {
  private _unprocessedResults = new ReplaySubject<[PanelData, ...PanelData[]]>(1);
  private _unprocessedSub?: Unsubscribable;
  private _processors?: Processors;

  protected _onActivate() {
    const timeRange = sceneGraph.getTimeRange(this);

    const processor = this.getClosestProcessor();
    if (processor) {
      processor.subscribeToState((n, p) => {
        const shouldRerun = processor.shouldRerun(p, n);
        if (shouldRerun.query) {
          this.runQueries();
        } else if (shouldRerun.processor) {
          this.runProcessors();
        }
      })
    }

    const adders = this.getClosestRequestAdders();
    for (const adder of adders.values()) {
      this._subs.add(
        adder.subscribeToState((n, p) => {
          const shouldRerun = adder.shouldRerun(p, n);
          if (shouldRerun.query) {
            this.runQueries();
          } else if (shouldRerun.processor) {
            this.runProcessors();
          }
        })
      )
    }

    // Handle legacy `SceneTimeRangeCompare`s from scenes.
    const comparer = this.getTimeCompare();

    if (comparer) {
      this._subs.add(
        comparer.subscribeToState((n, p) => {
          if (n.compareWith !== p.compareWith) {
            this.runQueries();
          }
        })
      );
    }


    this.subscribeToTimeRangeChanges(timeRange);

    if (this.shouldRunQueriesOnActivate()) {
      this.runQueries();
    }

    if (!this._dataLayersSub) {
      this._handleDataLayers();
    }

    return () => this._onDeactivate();
  }

  protected _onDeactivate(): void {
    if (this._querySub) {
      this._querySub.unsubscribe();
      this._querySub = undefined;
    }

    if (this._dataLayersSub) {
      this._dataLayersSub.unsubscribe();
      this._dataLayersSub = undefined;
    }

    if (this._unprocessedSub) {
      this._unprocessedSub.unsubscribe();
    }

    this._timeSub?.unsubscribe();
    this._timeSub = undefined;
    this._timeSubRange = undefined;
    this._adhocFiltersVar = undefined;
    this._groupByVar = undefined;
    this._variableValueRecorder.recordCurrentDependencyValuesForSceneObject(this);
  }

  /**
   * Walk up the scene graph and find any request adders.
   *
   * This will return a map from id to the closest adder for each id.
   */
  private getClosestRequestAdders(): Map<string, SceneRequestSupplementer<any>> {
    const found = new Map();
    if (!this.parent) {
      return new Map();
    }
    getClosest(this.parent, (s) => {
      if (isRequestAdder(s) && !found.has(s.constructor.name)) {
        found.set(s.constructor.name, s);
      }
      s.forEachChild((child) => {
        if (isRequestAdder(child) && !found.has(child.constructor.name)) {
          found.set(child.constructor.name, child);
        }
      });
      // Always return null so that the search continues to the top of
      // the scene graph.
      return null;
    });
    return found;
  }

  private getClosestProcessor(): SceneQueryProcessor<any> | undefined {
    let found: SceneQueryProcessor<any> | undefined = undefined;
    if (!this.parent) {
      return found;
    }
    getClosest(this.parent, (s) => {
      if (isQueryProcessor(s) && !found) {
        found = s;
        return found;
      }
      s.forEachChild((child) => {
        if (isQueryProcessor(child) && !found) {
          found = child;
          return found;
        }
      });
      // Always return null so that the search continues to the top of
      // the scene graph.
      return null;
    });
    return found;
  }

  public runQueries() {
    const timeRange = sceneGraph.getTimeRange(this);
    this.subscribeToTimeRangeChanges(timeRange);
    this.runWithTimeRange(timeRange);
    this.runProcessors();
  }

  private runProcessors() {
    if (this._unprocessedSub) {
      this._unprocessedSub.unsubscribe();
    }
    this._unprocessedSub = this._unprocessedResults.subscribe((x) => this.processResults(x));
  }

  private prepareRequestsAndProcessors = (
    timeRange: SceneTimeRangeLike,
    ds: DataSourceApi
  ): {
    primary: DataQueryRequest,
    primaryProcessor: (data: PanelData) => PanelData,
    secondaries: DataQueryRequest[]
    secondaryProcessors: Map<string, ProcessorFunc>,
  } => {
    const { minInterval, queries } = this.state;

    let request: DataQueryRequest<DataQueryExtended> = {
      app: 'scenes',
      requestId: getNextRequestId(),
      timezone: timeRange.getTimeZone(),
      panelId: 1,
      range: timeRange.state.value,
      interval: '1s',
      intervalMs: 1000,
      targets: cloneDeep(queries),
      maxDataPoints: this.getMaxDataPoints(),
      scopedVars: this._scopedVars,
      startTime: Date.now(),
      liveStreaming: this.state.liveStreaming,
      rangeRaw: {
        from: timeRange.state.from,
        to: timeRange.state.to,
      },
      cacheTimeout: this.state.cacheTimeout,
      queryCachingTTL: this.state.queryCachingTTL,
      // This asks the scene root to provide context properties like app, panel and dashboardUID
      ...getEnrichedDataRequest(this),
    };

    if (this._adhocFiltersVar) {
      // only pass filters that have both key and value
      // @ts-ignore (Temporary ignore until we update @grafana/data)
      request.filters = this._adhocFiltersVar.state.filters.filter(isFilterComplete);
    }

    if (this._groupByVar) {
      // @ts-ignore (Temporary ignore until we update @grafana/data)
      request.groupByKeys = this._groupByVar.state.value;
    }

    request.targets = request.targets.map((query) => {
      if (
        !query.datasource ||
        (query.datasource.uid !== ds.uid &&
          !ds.meta?.mixed &&
          isExpressionReference /* TODO: Remove this check when isExpressionReference is properly exported from grafan runtime */ &&
          !isExpressionReference(query.datasource))
      ) {
        query.datasource = ds.getRef();
      }
      return query;
    });

    // TODO interpolate minInterval
    const lowerIntervalLimit = minInterval ? minInterval : ds.interval;
    const norm = rangeUtil.calculateInterval(timeRange.state.value, request.maxDataPoints!, lowerIntervalLimit);

    // make shallow copy of scoped vars,
    // and add built in variables interval and interval_ms
    request.scopedVars = Object.assign({}, request.scopedVars, {
      __interval: { text: norm.interval, value: norm.interval },
      __interval_ms: { text: norm.intervalMs.toString(), value: norm.intervalMs },
    });

    request.interval = norm.interval;
    request.intervalMs = norm.intervalMs;

    let primaryProcessor = (data: PanelData) => data;
    const closestProcessor = this.getClosestProcessor();
    if (closestProcessor) {
      primaryProcessor = closestProcessor.getProcessor();
    }

    const primaryTimeRange = timeRange.state.value;
    const secondaryRequests: DataQueryRequest[] = [];
    const secondaryProcessors = new Map<string, ProcessorFunc>();
    for (const adder of this.getClosestRequestAdders().values() ?? []) {
      for (const { req, processor } of adder.getSupplementalRequests(request)) {
        const requestId = getNextRequestId();
        secondaryRequests.push({ ...req, requestId })
        secondaryProcessors.set(requestId, processor ?? ((_, d) => d));
      }
    }

    // Handle legacy `SceneTimeRangeCompare`s from scenes separately.
    const comparer = this.getTimeCompare();
    if (comparer) {
      const compareTimeRange = comparer.getCompareTimeRange(primaryTimeRange);
      if (compareTimeRange) {
        const compareTargets = request.targets.filter((query: DataQueryExtended) => query.timeRangeCompare !== false);
        if (compareTargets.length) {
          const requestId = getNextRequestId();
          secondaryRequests.push({
            ...request,
            targets: compareTargets,
            range: compareTimeRange,
            requestId,
          });
          secondaryProcessors.set(requestId, timeShiftQueryProcessor);
        }
      }
    }


    request.range = primaryTimeRange;
    return {
      primary: request,
      primaryProcessor,
      secondaries: secondaryRequests,
      secondaryProcessors,
    };
  };

  protected async runWithTimeRange(timeRange: SceneTimeRangeLike) {
    // If no maxDataPoints specified we might need to wait for container width to be set from the outside
    if (!this.state.maxDataPoints && this.state.maxDataPointsFromWidth && !this._containerWidth) {
      return;
    }

    // If data layers subscription doesn't exist, create one
    if (!this._dataLayersSub) {
      this._handleDataLayers();
    }

    // Cancel any running queries
    this._querySub?.unsubscribe();

    // Skip executing queries if variable dependency is in loading state
    if (this._variableDependency.hasDependencyInLoadingState()) {
      writeSceneLog('SceneQueryRunner', 'Variable dependency is in loading state, skipping query execution');
      return;
    }

    const { queries } = this.state;

    // Simple path when no queries exist
    if (!queries?.length) {
      this._setNoDataState();
      return;
    }

    try {
      const datasource = this.state.datasource ?? findFirstDatasource(queries);
      const ds = await getDataSource(datasource, this._scopedVars);

      this.findAndSubscribeToAdHocFilters(datasource?.uid);

      const runRequest = getRunRequest();
      const { primary, primaryProcessor, secondaries, secondaryProcessors } = this.prepareRequestsAndProcessors(timeRange, ds);
      this._processors = { primary: primaryProcessor, secondaries: secondaryProcessors };

      writeSceneLog('SceneQueryRunner', 'Starting runRequest', this.state.key);

      let primaryStream = runRequest(ds, primary)
        .pipe(registerQueryWithController({
          type: 'data',
          request: primary,
          origin: this,
          cancel: () => this.cancelQuery(),
        }));

      if (secondaries.length > 0) {
        const secondaryStreams = secondaries.map((r) => runRequest(ds, r)
          .pipe(registerQueryWithController({
            type: 'data',
            request: r,
            origin: this,
            cancel: () => this.cancelQuery(),
          })))
          ;
        // change subscribe callback below to pipe operator
        const stream = forkJoin([primaryStream, ...secondaryStreams]);
        this._querySub = stream.subscribe((data) => {
          this._unprocessedResults.next(data);
        });
      } else {
        this._querySub = primaryStream
          .pipe(map((data) => [data] as [PanelData, ...PanelData[]]))
          .subscribe((data) => {
            this._unprocessedResults.next(data);
          });
      }

    } catch (err) {
      console.error('PanelQueryRunner Error', err);

      this.onDataReceived({
        ...emptyPanelData,
        ...this.state.data,
        state: LoadingState.Error,
        errors: [toDataQueryError(err)],
      });
    }
  }

  private processResults(data: [PanelData, ...PanelData[]]) {
    const [primary, ...secondaries] = data;
    if (this._processors === undefined) {
      return this.onDataReceived(primary);
    }
    const { primary: primaryProcessor, secondaries: secondaryProcessors } = this._processors;
    const processedPrimary = primaryProcessor(data[0]);
    if (secondaries.length === 0) {
      return this.onDataReceived(processedPrimary);
    }
    const processedSecondaries = secondaries.map((s) => secondaryProcessors.get(s.request!.requestId)?.(primary, s) ?? s);
    const processed = {
      ...processedPrimary,
      series: [...processedPrimary.series, ...processedSecondaries.flatMap((s) => s.series)],
      annotations: [
        ...(processedPrimary.annotations ?? []),
        ...processedSecondaries.flatMap((s) => s.annotations ?? []),
      ],
    };
    this.onDataReceived(processed);
  }

}
