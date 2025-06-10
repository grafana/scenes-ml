import React from 'react';
import initClustering, { DbscanClusterer } from '@bsull/augurs/clustering';
import initDtw, { Dtw } from '@bsull/augurs/dtw';
import { DataFrame, DataQueryRequest, FieldType, GrafanaTheme2, PanelData, outerJoinDataFrames } from '@grafana/data';
import { FieldColorModeId } from '@grafana/schema';
import { ButtonGroup, Checkbox, Slider, ToolbarButton, Tooltip, useStyles2 } from '@grafana/ui';

import {
  SceneComponentProps,
  SceneObjectState,
  SceneObjectUrlValues,
  SceneObjectBase,
  SceneObjectUrlSyncConfig,
  ExtraQueryProvider,
  ExtraQueryDescriptor,
} from '@grafana/scenes';
import { css, cx } from '@emotion/css';
import { of } from 'rxjs';

Promise.all([initClustering(), initDtw()]).then(() => console.log('augurs loaded'));

interface SceneTimeSeriesClustererState extends SceneObjectState {
  epsilon?: number;
  pinned?: boolean;
}

const DEFAULT_EPSILON = 0.8;

export class SceneTimeSeriesClusterer
  extends SceneObjectBase<SceneTimeSeriesClustererState>
  implements ExtraQueryProvider<SceneTimeSeriesClustererState>
{
  public static Component = SceneTimeSeriesClustererRenderer;
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['clusterepsilon'] });
  private latestData: PanelData | undefined;
  private clusters: Record<number, Cluster> | undefined;

  public constructor(state: Partial<SceneTimeSeriesClustererState>) {
    super(state);
  }

  public onEpsilonChanged(epsilon: number | undefined) {
    this.setState({ epsilon });
  }

  public onPinnedChanged(pinned: boolean) {
    this.setState({ pinned });
  }

  public getClusterLabels(): Record<number, Cluster> | undefined {
    return this.clusters;
  }

  private setClusters(clusters: Record<number, Cluster>) {
    this.clusters = clusters;
  }

  private setLatestData(data: PanelData) {
    this.latestData = data;
  }

  public getExtraQueries(primary: DataQueryRequest): ExtraQueryDescriptor[] {
    const { epsilon } = this.state;
    return epsilon === undefined
      ? []
      : [
          {
            req: {
              ...primary,
              targets: [],
            },
            processor: (data, _) => {
              if (this.state.pinned && this.latestData !== undefined) {
                return of(this.latestData);
              }
              const frames = data.series;
              // Combine all frames into one by joining on time.
              const joined = outerJoinDataFrames({ frames });
              if (joined === undefined) {
                return of(data);
              }
              const { data: dataWithClusters, clusters } = addClusters(
                data,
                joined,
                this.state.epsilon ?? DEFAULT_EPSILON
              );
              this.setClusters(clusters);
              this.setLatestData(dataWithClusters);
              return of(dataWithClusters);
            },
          },
        ];
  }

  public shouldRerun(prev: SceneTimeSeriesClustererState, next: SceneTimeSeriesClustererState): boolean {
    if (next.pinned) {
      return false;
    }
    return prev.epsilon !== next.epsilon || prev.pinned !== next.pinned;
  }

  // Get the URL state for the component.
  public getUrlState(): SceneObjectUrlValues {
    return {
      clusterepsilon: this.state.epsilon?.toString(),
    };
  }

  public updateFromUrl(values: SceneObjectUrlValues) {
    if (!values.clusterepsilon) {
      return;
    }
    let epsilon: number | undefined;
    if (typeof values.clusterepsilon === 'string') {
      epsilon = parseFloat(values.clusterepsilon);
    }

    const stateUpdate: Partial<SceneTimeSeriesClustererState> = {};
    if (epsilon) {
      stateUpdate.epsilon = epsilon;
    } else {
      stateUpdate.epsilon = DEFAULT_EPSILON;
    }
    this.setState(stateUpdate);
  }
}

interface Cluster {
  series: number[];
  min: number[];
  max: number[];
  mid: number[];
}

function addClusters(
  data: PanelData,
  joined: DataFrame,
  epsilon: number
): {
  clusters: Record<number, Cluster>;
  data: PanelData;
} {
  const serieses = joined.fields.filter((f) => f.type === FieldType.number);
  // TODO: cache this min/max.
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const series of serieses) {
    for (const val of series.values) {
      min = Math.min(min, val);
      max = Math.max(max, val);
    }
  }
  const maxDistance = (max - min) * epsilon;
  // TODO: make this configurable.
  const minClusterSize = 3;
  const distanceMatrix = Dtw.euclidean({ window: 10 }).distanceMatrix(
    serieses.map((f) => new Float64Array(f.values as number[]))
  );
  const clusterLabels = new DbscanClusterer({ epsilon: maxDistance, minClusterSize }).fit(distanceMatrix);
  const clusters: Record<number, Cluster> = {};
  for (let seriesIdx = 0; seriesIdx < clusterLabels.length; seriesIdx++) {
    const cluster = clusterLabels[seriesIdx];
    if (cluster === -1) {
      continue;
    }
    const series = serieses[seriesIdx];
    const clusterBand = clusters[cluster] ?? {
      series: [seriesIdx],
      min: Array(series.values.length).fill(Number.POSITIVE_INFINITY),
      max: Array(series.values.length).fill(Number.NEGATIVE_INFINITY),
      mid: Array(series.values.length),
    };
    for (let i = 0; i < series.values.length; i++) {
      clusterBand.min[i] = Math.min(clusterBand.min[i], series.values[i]);
      clusterBand.max[i] = Math.max(clusterBand.max[i], series.values[i]);
      clusterBand.mid[i] = (clusterBand.min[i] + clusterBand.max[i]) / 2;
    }
    clusters[cluster] = clusterBand;
  }

  const clusterBandFields = Object.values(clusters).flatMap((clusterBand, cluster) => [
    {
      name: `clusterMin${cluster}`,
      type: FieldType.number,
      values: clusterBand.min,
      config: {
        displayNameFromDS: `Cluster ${cluster} Min`,
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
          },
        },
      },
    },
    {
      name: `clusterMid${cluster}`,
      type: FieldType.number,
      values: clusterBand.mid,
      config: {
        displayNameFromDS: `Cluster ${cluster} Midpoint`,
        custom: {
          lineWidth: 1,
          hideFrom: {
            viz: false,
            tooltip: false,
            legend: false,
          },
        },
      },
    },
    {
      name: `clusterMax${cluster}`,
      type: FieldType.number,
      values: clusterBand.max,
      config: {
        displayNameFromDS: `Cluster ${cluster} Max`,
        color: {
          fixedColor: 'gray',
          mode: FieldColorModeId.Fixed,
        },
        custom: {
          fillBelowTo: `clusterMin${cluster}`,
          lineWidth: 0,
          hideFrom: {
            viz: false,
            tooltip: false,
            legend: true,
          },
        },
      },
    },
  ]);

  return {
    clusters,
    data: {
      ...data,
      series: [
        {
          ...joined,
          fields: [
            // Always include the time field.
            joined.fields[0],
            ...clusterBandFields,
          ],
        },
      ],
    },
  };
}

function SceneTimeSeriesClustererRenderer({ model }: SceneComponentProps<SceneTimeSeriesClusterer>) {
  const styles = useStyles2(getStyles);
  const { pinned, epsilon } = model.useState();

  const onClick = () => {
    model.onEpsilonChanged(epsilon === undefined ? DEFAULT_EPSILON : undefined);
  };

  const onChangeEpsilon = (e: number | undefined) => {
    model.onEpsilonChanged(e);
  };

  const sliderStyles = epsilon === undefined || pinned ? cx(styles.slider, styles.disabled) : styles.slider;

  return (
    <ButtonGroup>
      <ToolbarButton
        variant="canvas"
        tooltip="Enable clustering"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick();
        }}
      >
        <Checkbox label=" " value={epsilon !== undefined} onClick={onClick} />
        Clustering
      </ToolbarButton>

      <Tooltip content="The sensitivity of the cluster analysis.">
        <div className={sliderStyles}>
          <Slider
            onAfterChange={onChangeEpsilon}
            min={0.01}
            max={0.99}
            step={0.01}
            value={epsilon ?? DEFAULT_EPSILON}
          />
        </div>
      </Tooltip>

      <ToolbarButton
        disabled={epsilon === undefined}
        variant="canvas"
        tooltip="Pin cluster results"
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
      & > div {
        .rc-slider {
          margin: auto 16px;
        }
        .rc-slider + div {
          display: none;
        }
      }
    `,
  };
}
