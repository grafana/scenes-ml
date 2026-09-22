import type {
  LoadedOutlierDetector as AugursLoadedOutlierDetector,
  OutlierDetector as AugursOutlierDetector,
  OutlierDetectorOptions,
  OutlierOutput,
} from '@bsull/augurs/outlier';

export default async function init() {}

const dummyOutliers: OutlierOutput = {
  outlyingSeries: [],
  clusterBand: { min: [], max: [] },
  seriesResults: [],
};

export class OutlierDetector implements AugursOutlierDetector {
  public free(): void {}
  public [Symbol.dispose](): void {}
  public detect(): OutlierOutput {
    return dummyOutliers;
  }
  public preprocess(_y: number[][] | Float64Array[]): AugursLoadedOutlierDetector {
    return new LoadedOutlierDetector();
  }
}

export class LoadedOutlierDetector implements AugursLoadedOutlierDetector {
  public detect(): OutlierOutput {
    return dummyOutliers;
  }
  public free(): void {}
  public [Symbol.dispose](): void {}
  public updateDetector(_options: OutlierDetectorOptions): void {}
}
