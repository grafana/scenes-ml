import { DataFrame, DataQueryRequest, DataQueryResponse, FieldType, LoadingState, TestDataSourceResponse } from '@grafana/data';
import { RuntimeDataSource } from '@grafana/scenes';
import { DataQuery } from '@grafana/schema';
import { Observable } from 'rxjs';

const forecastWave = [0, 0, 0.5, 1, 2, 2, 1, 1, 0.5, 0.3];

type DemoDataQuery = DataQuery & {
  type: 'forecast';
}

function forecastData({ range, intervalMs }: DataQueryRequest<DemoDataQuery>): DataFrame {
  const { from, to } = range;
  const numPoints = to.valueOf() - from.valueOf() / intervalMs;
  const time = Array.from({ length: numPoints }, (_, i) => from.valueOf() + i * intervalMs);
  const values = Array.from({ length: numPoints }, (_, i) => forecastWave[i % forecastWave.length]);
  return {
    fields: [
      { name: 'Time', type: FieldType.time, values: time, config: {} },
      { name: 'Value', type: FieldType.number, values, config: {} },
    ],
    length: 3,
  };
}

function targetData(target: DemoDataQuery, request: DataQueryRequest<DemoDataQuery>): DataFrame | undefined {
  switch (target.type) {
    case 'forecast':
      return forecastData(request);
  }
}

export class MLDemoDS extends RuntimeDataSource {
  public query(request: DataQueryRequest<DemoDataQuery>): Promise<DataQueryResponse> | Observable<DataQueryResponse> {
    return Promise.resolve({
      state: LoadingState.Done,
      data: request.targets
        .map((target) => targetData(target, request))
        .filter((data) => data !== undefined)
    });
  }

  public testDatasource(): Promise<TestDataSourceResponse> {
    return Promise.resolve({ status: 'success', message: 'OK' });
  }
}
