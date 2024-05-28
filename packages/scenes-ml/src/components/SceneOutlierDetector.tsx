import React from 'react';
import { DataQueryRequest, FieldType, GrafanaTheme2, PanelData, colorManipulator, outerJoinDataFrames } from "@grafana/data";
import { DataTopic, FieldColorModeId } from "@grafana/schema";
import { ButtonGroup, Checkbox, Slider, ToolbarButton, useStyles2 } from "@grafana/ui";
import { OutlierDetector } from "@grafana-ml/augurs";

import { SceneComponentProps, SceneObjectState, SceneObjectUrlValues, SceneObjectBase, SceneObjectUrlSyncConfig, ExtraQueryProvider, ExtraQueryDescriptor } from "@grafana/scenes";
import { css, cx } from '@emotion/css';


interface Outlier {
  series: number;
  start: number;
  end: number;
}

interface SceneOutlierDetectorState extends SceneObjectState {
  sensitivity?: number;
  addAnnotations?: boolean;
  onOutlierDetected?: (outlier: Outlier) => void;
}

const DEFAULT_SENSITIVITY = 0.5;

export class SceneOutlierDetector extends SceneObjectBase<SceneOutlierDetectorState>
  implements ExtraQueryProvider<SceneOutlierDetectorState> {

  public static Component = SceneOutlierDetectorRenderer;
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['outlierSensitivity', 'outlierAddAnnotations'] });

  public constructor(state: Partial<SceneOutlierDetectorState>) {
    super(state);
  }

  public onSensitivityChanged(sensitivity: number | undefined) {
    this.setState({ sensitivity });
  }

  public onAddAnnotationsChanged(addAnnotations: boolean) {
    this.setState({ addAnnotations });
  }

  public getExtraQueries(primary: DataQueryRequest): ExtraQueryDescriptor[] {
    return [
      {
        req: {
          ...primary,
          targets: [],
        },
        processor: (data, _) => this.state.sensitivity === undefined ? data : addOutliers(data, this.state.sensitivity, this.state.addAnnotations ?? true, this.state.onOutlierDetected)
      }
    ];
  }

  public shouldRerun(prev: SceneOutlierDetectorState, next: SceneOutlierDetectorState): boolean {
    return (prev.sensitivity !== next.sensitivity || prev.addAnnotations !== next.addAnnotations) ? true : false;
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

function addOutliers(data: PanelData, sensitivity: number, addAnnotations: boolean, onOutlierDetected?: (outlier: Outlier) => void): PanelData {
  const frames = data.series;
  // Combine all frames into one by joining on time.
  const joined = outerJoinDataFrames({ frames });
  if (joined === undefined) {
    return data;
  }
  // Get number fields: these are our series.
  const serieses = joined.fields.filter(f => f.type === FieldType.number);
  const points = new Float64Array(serieses.flatMap((series) => series.values as number[]));
  const nTimestamps = serieses[0].values.length;

  const detector = OutlierDetector.dbscan({ sensitivity });
  const outliers = detector.detect(points, nTimestamps);

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
  const { addAnnotations, sensitivity } = model.useState();

  const onClick = () => {
    model.onSensitivityChanged(sensitivity === undefined ? DEFAULT_SENSITIVITY : undefined);
  };

  const onChangeSensitivity = (e: number | undefined) => {
    model.onSensitivityChanged(e);
  }

  const sliderStyles = sensitivity === undefined ? cx(styles.slider, styles.disabled) : styles.slider;

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
        disabled={sensitivity === undefined}
        variant="canvas"
        tooltip="Add outlier annotations"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          model.onAddAnnotationsChanged(!(addAnnotations ?? true));
        }}
      >
        <Checkbox
          disabled={sensitivity === undefined}
          value={addAnnotations ?? true}
          onChange={() => model.onAddAnnotationsChanged(!(addAnnotations ?? true))}
        />
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
