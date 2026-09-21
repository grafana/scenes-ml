jest.mock('@bsull/augurs', () => {});
jest.mock('@bsull/augurs-prophet-wasmstan', () => {});

import { FieldType } from '@grafana/data';
import { detectAnomalies, Anomaly } from '../SceneBaseliner';

describe('SceneBaseliner anomaly detection', () => {
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
