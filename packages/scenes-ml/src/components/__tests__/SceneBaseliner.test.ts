jest.mock('@bsull/augurs', () => {});
jest.mock('@bsull/augurs-prophet-wasmstan', () => {});

import { FieldType } from '@grafana/data';
import { alignToGrid, detectAnomalies, Anomaly } from '../SceneBaseliner';

describe('alignToGrid', () => {
  it('maps values to correct grid positions with no gaps', () => {
    const timestamps = [0, 1, 2, 3];
    const values = [10, 20, 30, 40];
    const result = alignToGrid(timestamps, values, 0, 1, 4);
    expect(result).toEqual([10, 20, 30, 40]);
  });

  it('places values at correct grid indices when data has gaps', () => {
    // Data at times [0, 1, 3] — gap at time 2
    const timestamps = [0, 1, 3];
    const values = [10, 20, 40];
    const result = alignToGrid(timestamps, values, 0, 1, 4);
    // Grid: [0, 1, 2, 3] → v0=10, v1=20, v2=null (gap), v3=40
    expect(result).toEqual([10, 20, null, 40]);
  });

  it('handles multiple consecutive gaps', () => {
    const timestamps = [0, 4];
    const values = [10, 50];
    const result = alignToGrid(timestamps, values, 0, 1, 5);
    expect(result).toEqual([10, null, null, null, 50]);
  });

  it('handles millisecond timestamps with larger frequency', () => {
    const timestamps = [1000, 2000, 4000]; // gap at 3000
    const values = [1.5, 2.5, 4.5];
    const result = alignToGrid(timestamps, values, 1000, 1000, 4);
    expect(result).toEqual([1.5, 2.5, null, 4.5]);
  });

  it('returns all nulls for empty input', () => {
    const result = alignToGrid([], [], 0, 1, 3);
    expect(result).toEqual([null, null, null]);
  });

  it('ignores values outside the grid range', () => {
    const timestamps = [0, 1, 2, 10];
    const values = [10, 20, 30, 100];
    const result = alignToGrid(timestamps, values, 0, 1, 3);
    expect(result).toEqual([10, 20, 30]);
  });
});

describe('detectAnomalies', () => {
  const createMockField = (name = 'Value') => ({
    name,
    type: FieldType.number,
    values: [],
    config: {},
  });

  describe('correctly comparing original values against bounds', () => {
    it('detects obvious anomalies in original data', () => {
      const field = createMockField();

      const originalValues = [1.0, 0.1, 2.5, 1.0, 1.0]; // 0.1 < 0.5 (low), 2.5 > 1.5 (high)
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      const onAnomalyDetected = jest.fn((anomaly) => {
        anomalies.push(anomaly);
      });

      detectAnomalies(originalValues, times, lower, upper, field, onAnomalyDetected);

      expect(anomalies.length).toBe(2);
      expect(onAnomalyDetected).toHaveBeenCalledTimes(2);
      expect(anomalies[0]).toMatchObject({
        direction: 'lower',
        idx: 1,
        time: 2000,
        field,
      });
      expect(anomalies[1]).toMatchObject({
        direction: 'upper',
        idx: 2,
        time: 3000,
        field,
      });
    });

    it('detects extreme anomalies', () => {
      const field = createMockField();

      const originalValues = [-1000, 10000, 1.0, -500, 2000];
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(4);
      expect(anomalies[0].direction).toBe('lower'); // -1000 < 0.5
      expect(anomalies[1].direction).toBe('upper'); // 10000 > 1.5
      expect(anomalies[2].direction).toBe('lower'); // -500 < 0.5
      expect(anomalies[3].direction).toBe('upper'); // 2000 > 1.5
    });

    it('reports no anomalies when all original data is within bounds', () => {
      const field = createMockField();

      const originalValues = [1.0, 1.0, 1.0, 1.0, 1.0];
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(0);
    });

    it('skips null values (out-of-sample predictions)', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 1.0, null, null];
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(1);
      expect(anomalies[0].idx).toBe(1);
      expect(anomalies[0].direction).toBe('lower');
    });
  });

  describe('edge cases', () => {
    it('handles empty arrays', () => {
      const field = createMockField();
      const anomalies: Anomaly[] = [];

      detectAnomalies([], [], [], [], field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(0);
    });

    it('handles missing bounds arrays', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 2.5];
      const times = [1000, 2000, 3000];
      const onAnomalyDetected = jest.fn();

      detectAnomalies(originalValues, times, [], [1.5, 1.5, 1.5], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();

      detectAnomalies(originalValues, times, [0.5, 0.5, 0.5], [], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();
    });

    it('handles missing callback', () => {
      const field = createMockField();

      expect(() => {
        detectAnomalies([1.0, 0.1, 2.5], [1000, 2000, 3000], [0.5, 0.5, 0.5], [1.5, 1.5, 1.5], field);
      }).not.toThrow();
    });
  });

  describe('with gaps in data (alignToGrid + detectAnomalies)', () => {
    it('detects anomaly at correct grid position despite gap', () => {
      const field = createMockField();
      // Data at times [0, 1, 3] with values [1.0, 1.0, 5.0]
      // Grid [0, 1, 2, 3], freq=1
      // After alignment: [1.0, 1.0, null, 5.0]
      // Bounds: lower=0, upper=2 for all 4 grid positions
      // Anomaly should be at grid index 3 (time 3), not index 2
      const aligned = alignToGrid([0, 1, 3], [1.0, 1.0, 5.0], 0, 1, 4);
      const times = [0, 1, 2, 3];
      const lower = [0, 0, 0, 0];
      const upper = [2, 2, 2, 2];

      const anomalies: Anomaly[] = [];
      detectAnomalies(aligned, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(1);
      expect(anomalies[0]).toMatchObject({ direction: 'upper', idx: 3, time: 3 });
    });

    it('does not misattribute anomaly to gap position', () => {
      // Without proper alignment, value 5.0 (at time 3) would land at index 2 (time 2)
      // and the real time-3 position would be null.
      // Verify the gap position (index 2) is null/skipped.
      const aligned = alignToGrid([0, 1, 3], [1.0, 1.0, 5.0], 0, 1, 4);
      expect(aligned[2]).toBeNull();
      expect(aligned[3]).toBe(5.0);
    });
  });

  describe('real-world scenarios', () => {
    it('detects anomalies across multiple patterns', () => {
      const field = createMockField();
      const bounds = { lower: [20, 20, 20, 20, 20], upper: [80, 80, 80, 80, 80] };
      const times = [1000, 2000, 3000, 4000, 5000];

      const scenarios = [
        { name: 'Gradual drift', values: [50, 52, 54, 85, 88], expected: 2 },
        { name: 'Sudden spike', values: [40, 45, 150, 42, 44], expected: 1 },
        { name: 'System failure', values: [60, 65, 5, 3, 8], expected: 3 },
      ];

      scenarios.forEach((scenario) => {
        const anomalies: Anomaly[] = [];
        detectAnomalies(scenario.values, times, bounds.lower, bounds.upper, field, anomalies.push.bind(anomalies));
        expect(anomalies.length).toBe(scenario.expected);
      });
    });
  });

  describe('integration scenarios', () => {
    it('handles time range filtering with out-of-sample nulls', () => {
      const field = createMockField('Integration Test');

      const filteredOriginalData = [20, 90, 50, null, null];
      const times = [2000, 3000, 4000, 5000, 6000];
      const lower = [20, 20, 20, 20, 20];
      const upper = [80, 80, 80, 80, 80];

      const anomalies: Anomaly[] = [];
      detectAnomalies(filteredOriginalData, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(1);
      expect(anomalies[0]).toMatchObject({
        direction: 'upper',
        idx: 1,
        time: 3000,
        field,
      });
    });

    it('validates the fix for the original issue (GitHub #67)', () => {
      const field = createMockField('GitHub Issue #67 Test');

      const originalValues = [1.2, 0.3, 3.1, 1.1, 1.0]; // 0.3 < 0.5, 3.1 > 2.5
      const times = [1000, 2000, 3000, 4000, 5000];
      const lowerBounds = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upperBounds = [2.5, 2.5, 2.5, 2.5, 2.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lowerBounds, upperBounds, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(2);
      expect(anomalies[0]).toMatchObject({ direction: 'lower', idx: 1, time: 2000 });
      expect(anomalies[1]).toMatchObject({ direction: 'upper', idx: 2, time: 3000 });
    });
  });
});
