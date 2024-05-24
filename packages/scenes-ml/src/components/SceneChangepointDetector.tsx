import { DataFrame, DataQueryRequest, dateTime, FieldType } from "@grafana/data";
import { DataTopic } from "@grafana/schema";
import { ButtonGroup, Checkbox, ToolbarButton } from "@grafana/ui";
import { ChangepointDetector } from "@grafana-ml/augurs";
import React from 'react';

import { ProcessorFunc, SceneComponentProps, SceneObjectState, SceneObjectUrlValues, SceneObjectBase, SceneObjectUrlSyncConfig, SupplementaryRequestProvider, ShouldRerun, SupplementaryRequest } from "@grafana/scenes";

export interface Changepoint {
  time: number;
}

interface SceneChangepointDetectorState extends SceneObjectState {
  enabled?: boolean;
  // The look-back factor to use when establishing a baseline.
  // The detector will multiply the range of the data by this factor to determine
  // the amount of data to use as training data. Defaults to 4.0.
  lookbackFactor?: number;
  lookbackFactorOptions: Array<{ label: string; value: number }>;

  // Callback for when a changepoint is detected.
  // TODO: add series info to this.
  onChangepointDetected?: ((changepoint: Changepoint) => void);
}

// TODO: make this customisable.
export const DEFAULT_LOOKBACK_FACTOR_OPTIONS = [
  { label: '1x', value: 1 },
  { label: '4x', value: 4 },
  { label: '10x', value: 10 },
];

export const DEFAULT_LOOKBACK_FACTOR_OPTION = {
  label: '4x',
  value: 4,
};

export class SceneChangepointDetector extends SceneObjectBase<SceneChangepointDetectorState>
  implements SupplementaryRequestProvider<SceneChangepointDetectorState> {

  public static Component = SceneChangepointDetectorRenderer;
  protected _urlSync = new SceneObjectUrlSyncConfig(this, { keys: ['changepointLookbackFactor', 'changepointEnabled'] });

  public constructor(state: Partial<SceneChangepointDetectorState>) {
    super({ lookbackFactorOptions: DEFAULT_LOOKBACK_FACTOR_OPTIONS, ...state });
  }

  // Add secondary requests, used to obtain and transform the training data.
  public getSupplementaryRequests(request: DataQueryRequest): SupplementaryRequest[] {
    const extraRequests: SupplementaryRequest[] = [];
    if (this.state.enabled) {
      const { to, from: origFrom } = request.range;
      const diffMs = to.diff(origFrom);
      const from = dateTime(to).subtract(this.state.lookbackFactor ?? DEFAULT_LOOKBACK_FACTOR_OPTION.value * diffMs);
      extraRequests.push({
        req: {
          ...request,
          range: {
            from,
            to,
            raw: {
              from,
              to,
            },
          },
        },
        processor: changepointProcessor(this),
      });
    }
    return extraRequests;
  }

  // Determine if the component should be re-rendered.
  public shouldRerun(prev: SceneChangepointDetectorState, next: SceneChangepointDetectorState): ShouldRerun {
    // TODO: change when we allow the state to be configured in the UI.
    return prev.enabled !== next.enabled;
  }

  // Get the URL state for the component.
  public getUrlState(): SceneObjectUrlValues {
    return {
      changepointLookbackFactor: this.state.lookbackFactor?.toString(),
      changepointEnabled: this.state.enabled?.toString(),
    };
  }

  public onEnabledChanged(enabled: boolean) {
    this.setState({ enabled });
  }

  public onFactorChanged(lookbackFactor: number) {
    this.setState({ lookbackFactor });
  }

  public onClearFactor() {
    this.setState({ lookbackFactor: undefined });
  }

  // Update the component state from the URL.
  public updateFromUrl(values: SceneObjectUrlValues) {
    if (!values.changepointLookbackFactor && !values.changepointEnabled) {
      return;
    }
    let factor: number | undefined;
    if (typeof values.changepointLookbackFactor === 'string') {
      factor = parseInt(values.changepointLookbackFactor, 10);
    } else if (values.changepointLookbackFactor instanceof Array) {
      factor = parseInt(values.changepointLookbackFactor[0], 10);
    }
    let enabled: boolean | undefined;
    if (typeof values.changepointEnabled === 'string') {
      enabled = values.changepointEnabled === 'true';
    } else if (typeof values.changepointEnabled === 'number') {
      enabled = values.changepointEnabled === 1;
    }
    const stateUpdate: Partial<SceneChangepointDetectorState> = {};
    if (factor) {
      const options = DEFAULT_LOOKBACK_FACTOR_OPTIONS;
      if (options.find(({ value }) => value === factor)) {
        stateUpdate.lookbackFactor = factor;
      } else {
        stateUpdate.lookbackFactor = DEFAULT_LOOKBACK_FACTOR_OPTION.value;
      }
    }
    if (enabled) {
      stateUpdate.enabled = enabled;
    }
    this.setState(stateUpdate);
  }
}

// The transformation function for the changepoint detector.
//
// This function will take the secondary frame returned by the query runner and
// produce a new frame with the changepoint annotations.
const changepointProcessor: (detector: SceneChangepointDetector) => ProcessorFunc = (detector) => (_, secondary) => {
  const annotations = secondary.series.map((series) => createChangepointAnnotations(series, detector.state.onChangepointDetected));
  return { timeRange: secondary.timeRange, series: [], state: secondary.state, annotations };
}

function createChangepointAnnotations(
  frame: DataFrame,
  onChangepointDetected: ((changepoint: Changepoint) => void) | undefined,
): DataFrame {
  const annotationTimes = [];
  const annotationTexts = [];
  const timeField = frame.fields.find((field) => field.type === FieldType.time);
  if (!timeField) {
    return { fields: [], length: 0 }
  }
  for (const field of frame.fields) {
    if (field.type !== FieldType.number) {
      continue;
    }
    // TODO: Pass through params to the detector.
    const cpd = ChangepointDetector.default_argpcp();
    const values = new Float64Array(field.values);
    const cps = cpd.detect_changepoints(values);
    for (const cp of cps.indices) {
      const time = timeField.values[cp + 1];
      annotationTimes.push(time);
      annotationTexts.push('Changepoint detected');
      onChangepointDetected?.({ time });
    }
  }
  return {
    fields: [
      {
        name: 'time',
        type: FieldType.time,
        values: annotationTimes,
        config: {},
      },
      {
        name: 'text',
        type: FieldType.string,
        values: annotationTexts,
        config: {},
      }
    ],
    length: annotationTimes.length,
    meta: {
      dataTopic: DataTopic.Annotations,
    }
  };
}

function SceneChangepointDetectorRenderer({ model }: SceneComponentProps<SceneChangepointDetector>) {
  const { enabled } = model.useState();

  const onClick = (enabled: boolean) => {
    model.onEnabledChanged(enabled);
  };

  return (
    <ButtonGroup>
      <ToolbarButton
        variant="canvas"
        tooltip="Enable changepoint detection"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClick(!enabled);
        }}
      >
        <Checkbox label=" " value={enabled ?? false} onClick={() => onClick(!enabled)} />
        Changepoints
      </ToolbarButton>
    </ButtonGroup>
  );
}
