import React from 'react';
import { LoadedOutlierDetector, OutlierDetector } from "@bsull/augurs";
import { DataFrame, DataQueryRequest, FieldType, GrafanaTheme2, PanelData, colorManipulator, outerJoinDataFrames } from "@grafana/data";
import { DataTopic, FieldColorModeId } from "@grafana/schema";
import { ButtonGroup, Checkbox, RadioButtonGroup, Slider, ToolbarButton, Tooltip, useStyles2 } from "@grafana/ui";

import { SceneComponentProps, SceneObjectState, SceneObjectUrlValues, SceneObjectBase, SceneObjectUrlSyncConfig, ExtraQueryProvider, ExtraQueryDescriptor } from "@grafana/scenes";
import { css, cx } from '@emotion/css';
import { of } from 'rxjs';

// A subset of an outlying series, with a start and end time.
interface Outlier {
  // The index of the series in the data frame.
  series: number;
  // The start time of the outlier.
  start: number;
  // The end time of the outlier, if it's a region.
  end: number;
}

// The algorithm to use for outlier detection.
//
// `dbscan` uses a density-based clustering algorithm to detect outliers.
// `mad` uses the median absolute deviation to detect outliers.
//
// The default is `dbscan`.
type OutlierDetectorAlgorithm = 'dbscan' | 'mad';

interface SceneOutlierDetectorState extends SceneObjectState {
  // The sensitivity of the outlier detector. Must be between 0 and 1.
  sensitivity?: number;
  // Whether to add annotations to the time series panel when outliers
  // are detected..
  addAnnotations?: boolean;
  // Callback for when an outlier is detected.
  onOutlierDetected?: (outlier: Outlier) => void;
  // Whether the outlier results are pinned. If pinned, the results will not be recalculated
  // when the time range (or other state) changes.
  pinned?: boolean;
  /// The algorithm to use for outlier detection.
  algorithm?: OutlierDetectorAlgorithm;
}

const DEFAULT_SENSITIVITY = 0.5;

export class SceneOutlierDetector extends SceneObjectBase<SceneOutlierDetectorState>
  implements ExtraQueryProvider<SceneOutlierDetectorState> {

  public static Component = SceneOutlierDetectorRenderer;
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['outlierSensitivity', 'outlierAddAnnotations'] });
  private latestData: PanelData | undefined;

  // The most recent detector instance.
  protected detector?: LoadedOutlierDetector;
  // The request ID of the last request, to ensure we don't re-process the detector's
  // input data if it's the same as the previous run.
  protected lastRequestId?: string;

  public constructor(state: Partial<SceneOutlierDetectorState>) {
    super(state);
  }

  public onAlgorithmChanged(algorithm: OutlierDetectorAlgorithm) {
    this.setState({ algorithm });
  }

  public onSensitivityChanged(sensitivity: number | undefined) {
    this.setState({ sensitivity });
  }

  public onAddAnnotationsChanged(addAnnotations: boolean) {
    this.setState({ addAnnotations });
  }

  public onPinnedChanged(pinned: boolean) {
    this.setState({ pinned });
  }

  private setLatestData(data: PanelData) {
    this.latestData = data;
  }

  public getExtraQueries(primary: DataQueryRequest): ExtraQueryDescriptor[] {
    const { sensitivity, algorithm } = this.state;
    return sensitivity === undefined ? [] : [
      {
        req: {
          ...primary,
          targets: [],
        },
        processor: (data, _) => {
          if (this.state.pinned && this.latestData !== undefined) {
            return of(this.latestData)
          }
          const frames = data.series;
          // Combine all frames into one by joining on time.
          const joined = outerJoinDataFrames({ frames });
          if (joined === undefined) {
            return of(data);
          }
          // If the detector already exists and the request ID is the same as the last one,
          // just update the sensitivity.
          // Otherwise, create a new detector instance, with fresh data and sensitivity.
          // Note: this won't work unless we have a way to avoid re-requesting the data
          // on every rerun, which needs a change to the `shouldRerun` signature.
          // See https://github.com/grafana/scenes/pull/748 for one possible option.
          if (this.detector !== undefined && data.request?.requestId === this.lastRequestId) {
            this.detector.updateDetector({ sensitivity });
          } else {
            this.detector = createDetector(algorithm ?? 'dbscan', joined, sensitivity);
          }
          this.lastRequestId = data.request?.requestId;
          const dataWithOutliers = addOutliers(this.detector, data, joined, this.state.addAnnotations ?? true, this.state.onOutlierDetected);
          this.setLatestData(dataWithOutliers);
          return of(dataWithOutliers);
        },
      }
    ];
  }

  public shouldRerun(prev: SceneOutlierDetectorState, next: SceneOutlierDetectorState): boolean {
    if (next.pinned) {
      return false;
    }
    return prev.sensitivity !== next.sensitivity || prev.addAnnotations !== next.addAnnotations || prev.pinned !== next.pinned || prev.algorithm !== next.algorithm;
  }

  // Get the URL state for the component.
  public getUrlState(): SceneObjectUrlValues {
    return {
      outlierSensitivity: this.state.sensitivity?.toString(),
      outlierAddAnnotations: this.state.addAnnotations?.toString(),
    };
  }

  public updateFromUrl(values: SceneObjectUrlValues) {
    if (!values.outlierSensitivity && !values.outlierAddAnnotations) {
      return;
    }
    let sensitivity: number | undefined;
    if (typeof values.outlierSensitivity === 'string') {
      sensitivity = parseFloat(values.outlierSensitivity);
    }

    let addAnnotations: boolean | undefined;
    if (typeof values.outlierAddAnnotations === 'string') {
      addAnnotations = values.outlierAddAnnotations === 'true';
    }

    const stateUpdate: Partial<SceneOutlierDetectorState> = {};
    if (sensitivity) {
      stateUpdate.sensitivity = sensitivity;
    } else {
      stateUpdate.sensitivity = DEFAULT_SENSITIVITY;
    }
    if (addAnnotations) {
      stateUpdate.addAnnotations = addAnnotations;
    } else {
      stateUpdate.addAnnotations = true;
    }
    this.setState(stateUpdate);
  }
}

function createDetector(algorithm: OutlierDetectorAlgorithm, data: DataFrame, sensitivity: number): LoadedOutlierDetector {
  // Get number fields: these are our series.
  const serieses = data.fields.filter(f => f.type === FieldType.number);
  const points = serieses.map((series) => new Float64Array(series.values));
  switch (algorithm) {
    case 'dbscan':
      return OutlierDetector.dbscan({ sensitivity }).preprocess(points);
    case 'mad':
      return OutlierDetector.mad({ sensitivity }).preprocess(points);
  }
}

function addOutliers(detector: LoadedOutlierDetector, data: PanelData, joined: DataFrame, addAnnotations: boolean, onOutlierDetected?: (outlier: Outlier) => void): PanelData {
  // TODO: avoid duplicating the serieses extraction.
  const serieses = joined.fields.filter(f => f.type === FieldType.number);
  const nTimestamps = joined.fields[0].values.length;
  const outliers = detector.detect();

  if (onOutlierDetected !== undefined) {
    let idx = 0;
    for (const s of outliers.seriesResults) {
      for (const i of s.outlierIntervals) {
        onOutlierDetected({
          series: idx,
          start: joined.fields[0].values[i.start],
          end: joined.fields[0].values[i.end ?? nTimestamps - 1],
        });
      }
      idx += 1;
    }
  }

  // increase transparency as the number of series increases, so that the non-outliers are less prominent
  const transparency = 1 / Math.sqrt(1 + (serieses.length ?? 0) / 2);
  const notOutlierColor = colorManipulator.alpha('#FFFFFF', transparency);

  const annotations = [];
  if (addAnnotations) {
    const outlierStartTimes = outliers.seriesResults.flatMap((s) => s.outlierIntervals.map(interval => joined.fields[0].values[interval.start]));
    const outlierEndTimes = outliers.seriesResults.flatMap((s) => s.outlierIntervals.map(interval => joined.fields[0].values[interval.end ?? nTimestamps - 1]));
    const outlierAnnotationTexts = outliers.seriesResults.flatMap((s, i) => s.outlierIntervals.map(_ => `Outlier detected in series ${serieses[i].name}`));
    annotations.push({
      fields: [
        {
          name: 'time',
          type: FieldType.time,
          values: outlierStartTimes,
          config: {},
        },
        {
          name: 'timeEnd',
          type: FieldType.time,
          values: outlierEndTimes,
          config: {},
        },
        {
          name: 'text',
          type: FieldType.string,
          values: outlierAnnotationTexts,
          config: {},
        },
        {
          name: 'isRegion',
          type: FieldType.boolean,
          values: Array(outlierStartTimes.length).fill(true),
          config: {},
        },
      ],
      length: outlierStartTimes.length,
      meta: {
        dataTopic: DataTopic.Annotations,
      },
    });
  }

  // Should return:
  // - The original data with a new label field indicating whether it's an outlier or not
  // - New fields for minimum and maximum bands of the cluster
  const fields = [
    // Always include the time field.
    joined.fields[0],
    ...joined.fields.slice(1).map((f, i) => ({
      ...f,
      config: {
        ...f.config,
        ...(outliers.outlyingSeries.includes(i) ? {
          color: {
            fixedColor: '#f5b73d',
            mode: FieldColorModeId.Fixed,
          },
        } : {
          color: {
            fixedColor: notOutlierColor,
            mode: FieldColorModeId.Fixed,
          }
        }),
      }
    })),
  ];
  if (outliers.clusterBand) {
    fields.push({
      name: 'clusterMin',
      type: FieldType.number,
      values: outliers.clusterBand.min,
      config: {
        displayNameFromDS: 'Cluster Min',
        color: {
          fixedColor: 'gray',
          mode: FieldColorModeId.Fixed,
        },
        custom: {
          lineWidth: 0,
          hideFrom: {
            viz: false,
            tooltip: false,
            legend: true,
          }
        },
      }
    });
    fields.push({
      name: 'clusterMax',
      type: FieldType.number,
      values: outliers.clusterBand.max,
      config: {
        displayNameFromDS: 'Cluster Max',
        color: {
          fixedColor: 'gray',
          mode: FieldColorModeId.Fixed,
        },
        custom: {
          fillBelowTo: `Cluster Min`,
          lineWidth: 0,
          hideFrom: {
            viz: false,
            tooltip: false,
            legend: true,
          }
        },
      }
    });
  }
  return {
    ...data,
    series: [{ ...joined, fields }],
    annotations,
  };
}

function SceneOutlierDetectorRenderer({ model }: SceneComponentProps<SceneOutlierDetector>) {
  const styles = useStyles2(getStyles);
  const { addAnnotations, pinned, sensitivity, algorithm } = model.useState();

  const onClick = () => {
    model.onSensitivityChanged(sensitivity === undefined ? DEFAULT_SENSITIVITY : undefined);
  };

  const onChangeAlgorithm = (v: OutlierDetectorAlgorithm) => {
    model.onAlgorithmChanged(v);
  }

  const onChangeSensitivity = (e: number | undefined) => {
    model.onSensitivityChanged(e);
  }

  const sliderStyles = sensitivity === undefined || pinned ? cx(styles.slider, styles.disabled) : styles.slider;

  return (
    <ButtonGroup>
      <ToolbarButton
        variant="canvas"
        tooltip="Enable outlier detection"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick();
        }}
      >
        <Checkbox label=" " value={sensitivity !== undefined} onClick={onClick} />
        Outliers
      </ToolbarButton>

      <Tooltip content="The model to use for outlier detection.">
        <div>
          <RadioButtonGroup
            options={[{ label: 'DBSCAN', value: 'dbscan' }, { label: 'MAD', value: 'mad' }]}
            disabled={sensitivity === undefined}
            value={algorithm ?? 'dbscan'}
            onChange={v => (v === "dbscan" || v === "mad") && onChangeAlgorithm(v)}
            size="md"
          />
        </div>
      </Tooltip>

      <Tooltip content="The sensitivity of the outlier detector.">
        <div className={sliderStyles}>
          <Slider
            onAfterChange={onChangeSensitivity}
            min={0.01}
            max={0.99}
            step={0.01}
            value={sensitivity ?? DEFAULT_SENSITIVITY}
          />
        </div>
      </Tooltip>

      <ToolbarButton
        disabled={sensitivity === undefined || pinned}
        variant="canvas"
        tooltip="Add outlier annotations"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          model.onAddAnnotationsChanged(!(addAnnotations ?? true));
        }}
        isHighlighted={addAnnotations ?? true}
        icon="ellipsis-v"
        iconSize="sm"
        iconOnly
      />
      <ToolbarButton
        disabled={sensitivity === undefined}
        variant="canvas"
        tooltip="Pin outlier detection results"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          model.onPinnedChanged(!pinned);
        }}
        isHighlighted={pinned ?? false}
        icon="gf-pin"
        iconSize="sm"
        iconOnly
      />
    </ButtonGroup>
  );
}

function getStyles(theme: GrafanaTheme2) {
  return {
    disabled: css`
      & > div {
        opacity: 0.2;
      }
    `,
    slider: css`
      display: flex;
      width: 120px;
      align-items: center;
      border: 1px solid ${theme.colors.secondary.border};
      cursor: pointer;
      & > div {
        .rc-slider {
          margin: auto 16px;
        }
        .rc-slider + div {
          display: none;
        }
      }
    `,
  }
};
