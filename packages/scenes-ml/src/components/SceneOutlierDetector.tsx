import React from 'react';
import { LoadedOutlierDetector, OutlierDetector } from "@bsull/augurs";
import { DataFrame, DataQueryRequest, FieldType, GrafanaTheme2, PanelData, colorManipulator, outerJoinDataFrames } from "@grafana/data";
import { DataTopic, FieldColorModeId } from "@grafana/schema";
import { ButtonGroup, Checkbox, Icon, Slider, ToolbarButton, useStyles2 } from "@grafana/ui";

import { SceneComponentProps, SceneObjectState, SceneObjectUrlValues, SceneObjectBase, SceneObjectUrlSyncConfig, ExtraQueryProvider, ExtraQueryDescriptor } from "@grafana/scenes";
import { css, cx } from '@emotion/css';
import { of } from 'rxjs';


interface Outlier {
  series: number;
  start: number;
  end: number;
}

interface SceneOutlierDetectorState extends SceneObjectState {
  sensitivity?: number;
  addAnnotations?: boolean;
  onOutlierDetected?: (outlier: Outlier) => void;
  pinned?: boolean;
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
    const { sensitivity } = this.state;
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
            this.detector.updateDetector({ dbscan: { sensitivity } });
          } else {
            this.detector = createDetector(joined, sensitivity);
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
    return prev.sensitivity !== next.sensitivity || prev.addAnnotations !== next.addAnnotations || prev.pinned !== next.pinned;
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

function createDetector(data: DataFrame, sensitivity: number): LoadedOutlierDetector {
  // Get number fields: these are our series.
  const serieses = data.fields.filter(f => f.type === FieldType.number);
  const nTimestamps = serieses[0].values.length;
  const points = new Float64Array(serieses.flatMap((series) => series.values as number[]));
  return OutlierDetector.dbscan({ sensitivity }).preprocess(points, nTimestamps);
}

function addOutliers(detector: LoadedOutlierDetector, data: PanelData, joined: DataFrame, addAnnotations: boolean, onOutlierDetected?: (outlier: Outlier) => void): PanelData {
  // TODO: avoid duplicating the serieses extraction.
  const serieses = joined.fields.filter(f => f.type === FieldType.number);
  const nTimestamps = joined.fields[0].values.length;
  const outliers = detector.detect();

  if (onOutlierDetected !== undefined) {
    const idx = 0;
    for (const s of outliers.seriesResults) {
      for (const i of s.outlierIntervals) {
        onOutlierDetected({
          series: idx,
          start: joined.fields[0].values[i.start],
          end: joined.fields[0].values[i.end ?? nTimestamps - 1],
        });
      }
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
  return {
    ...data,
    series: [
      {
        ...joined,
        fields: [
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
          {
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
          },
          {
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
          },
        ],
      },
    ],
    annotations,
  };
}

function SceneOutlierDetectorRenderer({ model }: SceneComponentProps<SceneOutlierDetector>) {
  const styles = useStyles2(getStyles);
  const { addAnnotations, pinned, sensitivity } = model.useState();

  const onClick = () => {
    model.onSensitivityChanged(sensitivity === undefined ? DEFAULT_SENSITIVITY : undefined);
  };

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

      <div className={sliderStyles}>
        <Slider
          onChange={onChangeSensitivity}
          min={0.01}
          max={0.99}
          step={0.01}
          value={sensitivity ?? DEFAULT_SENSITIVITY}
        />
      </div>

      <ToolbarButton
        disabled={sensitivity === undefined || pinned}
        variant="canvas"
        tooltip="Add outlier annotations"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          model.onAddAnnotationsChanged(!(addAnnotations ?? true));
        }}
      >
        <Checkbox
          disabled={sensitivity === undefined || pinned}
          value={addAnnotations ?? true}
          onChange={() => model.onAddAnnotationsChanged(!(addAnnotations ?? true))}
        />
      </ToolbarButton>
      <ToolbarButton
        disabled={sensitivity === undefined}
        variant="canvas"
        tooltip="Pin outlier detection results"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          model.onPinnedChanged(!pinned);
        }}
      >
        <Checkbox
          disabled={sensitivity === undefined}
          value={pinned ?? false}
          onChange={() => model.onPinnedChanged(!pinned)}
        />
        <Icon size="sm" name="gf-pin" />
      </ToolbarButton>
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
  }
};
