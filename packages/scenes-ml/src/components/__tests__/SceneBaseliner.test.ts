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

    it('correctly handles null values in original data (out-of-sample predictions)', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 1.0, null, null]; // Last two are out-of-sample
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      // Should only detect anomaly in index 1, skip nulls at indices 3,4
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].idx).toBe(1);
      expect(anomalies[0].direction).toBe('lower');
    });
  });

  describe('Edge cases', () => {
    it('handles empty arrays gracefully', () => {
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

      // Test with empty lower bounds
      detectAnomalies(originalValues, times, [], [1.5, 1.5, 1.5], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();

      // Test with empty upper bounds
      detectAnomalies(originalValues, times, [0.5, 0.5, 0.5], [], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();
    });

    it('handles missing callback function', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 2.5];
      const times = [1000, 2000, 3000];
      const lower = [0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5];

      expect(() => {
        detectAnomalies(originalValues, times, lower, upper, field);
      }).not.toThrow();
    });
  });

  describe('Real-world scenarios', () => {
    it('detects anomalies across multiple realistic patterns', () => {
      const field = createMockField();

      const scenarios = [
        {
          name: 'Gradual drift',
          originalValues: [50, 52, 54, 85, 88], // 85, 88 > 80
          expectedAnomalies: 2,
        },
        {
          name: 'Sudden spike',
          originalValues: [40, 45, 150, 42, 44], // 150 > 80
          expectedAnomalies: 1,
        },
        {
          name: 'System failure',
          originalValues: [60, 65, 5, 3, 8], // 5, 3, 8 < 20
          expectedAnomalies: 3,
        },
      ];

      const bounds = { lower: [20, 20, 20, 20, 20], upper: [80, 80, 80, 80, 80] };
      const times = [1000, 2000, 3000, 4000, 5000];

      scenarios.forEach((scenario) => {
        const anomalies: Anomaly[] = [];
        detectAnomalies(
          scenario.originalValues,
          times,
          bounds.lower,
          bounds.upper,
          field,
          anomalies.push.bind(anomalies)
        );

        expect(anomalies.length).toBe(scenario.expectedAnomalies);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('handles time range filtering with out-of-sample nulls', () => {
      const field = createMockField('Integration Test');

      const filteredOriginalData = [20, 90, 50, null, null]; // After time filtering + out-of-sample nulls
      const times = [2000, 3000, 4000, 5000, 6000];
      const lower = [20, 20, 20, 20, 20];
      const upper = [80, 80, 80, 80, 80];

      const detectedAnomalies: Anomaly[] = [];
      const onAnomalyDetected = jest.fn((anomaly) => {
        detectedAnomalies.push(anomaly);
      });

      detectAnomalies(filteredOriginalData, times, lower, upper, field, onAnomalyDetected);

      // Should detect 1 anomaly: originalValue 90 > upper bound 80 at index 1
      // Should skip null values at indices 3, 4 (out-of-sample predictions)
      expect(detectedAnomalies.length).toBe(1);
      expect(detectedAnomalies[0]).toMatchObject({
        direction: 'upper',
        idx: 1,
        time: 3000,
        field,
      });
      expect(onAnomalyDetected).toHaveBeenCalledTimes(1);
    });

    it('validates the fix for the original issue (GitHub #67)', () => {
      const field = createMockField('GitHub Issue #67 Test');

      // Scenario: original data has anomalies that the old code missed
      const originalValues = [1.2, 0.3, 3.1, 1.1, 1.0]; // 0.3 < 0.5, 3.1 > 2.5
      const times = [1000, 2000, 3000, 4000, 5000];
      const lowerBounds = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upperBounds = [2.5, 2.5, 2.5, 2.5, 2.5];

      const detectedAnomalies: Anomaly[] = [];
      detectAnomalies(
        originalValues,
        times,
        lowerBounds,
        upperBounds,
        field,
        detectedAnomalies.push.bind(detectedAnomalies)
      );

      expect(detectedAnomalies.length).toBe(2);
      expect(detectedAnomalies[0]).toMatchObject({
        direction: 'lower',
        idx: 1,
        time: 2000,
      });
      expect(detectedAnomalies[1]).toMatchObject({
        direction: 'upper',
        idx: 2,
        time: 3000,
      });
    });
  });
});
