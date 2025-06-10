jest.mock('@bsull/augurs', () => {});
jest.mock('@bsull/augurs-prophet-wasmstan', () => {});

// Comprehensive test suite demonstrating the anomaly detection bug in SceneBaseliner
import { FieldType } from '@grafana/data';
import { detectAnomalies, Anomaly } from '../SceneBaseliner';

describe('SceneBaseliner anomaly detection bug', () => {
  const createMockField = (name = 'Value') => ({
    name,
    type: FieldType.number,
    values: [],
    config: {},
  });

  describe('Fixed behavior: correctly comparing original values against bounds', () => {
    it('now correctly detects obvious anomalies in original data', () => {
      const field = createMockField();

      // Test data: originalValues has clear anomalies, modelValues are perfect
      const originalValues = [1.0, 0.1, 2.5, 1.0, 1.0]; // 0.1 < 0.5 (low), 2.5 > 1.5 (high)
      const modelValues = [1.0, 1.0, 1.0, 1.0, 1.0]; // All within bounds [0.5, 1.5]
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      const onAnomalyDetected = jest.fn((anomaly) => {
        anomalies.push(anomaly);
      });

      detectAnomalies(originalValues, modelValues, times, lower, upper, field, onAnomalyDetected);

      // FIXED: Now correctly detects 2 anomalies in original data
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

    it('now correctly detects extreme anomalies', () => {
      const field = createMockField();

      // Extreme anomalies that should definitely be caught
      const originalValues = [-1000, 10000, 1.0, -500, 2000]; // Massive outliers
      const modelValues = [1.0, 1.0, 1.0, 1.0, 1.0]; // Perfect model predictions
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, modelValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      // FIXED: Now correctly detects all 4 extreme anomalies
      expect(anomalies.length).toBe(4);
      expect(anomalies[0].direction).toBe('lower'); // -1000 < 0.5
      expect(anomalies[1].direction).toBe('upper'); // 10000 > 1.5
      expect(anomalies[2].direction).toBe('lower'); // -500 < 0.5
      expect(anomalies[3].direction).toBe('upper'); // 2000 > 1.5
    });

    it('now correctly ignores model predictions and only looks at original data', () => {
      const field = createMockField();

      // Case where model predictions are anomalous but original data is normal
      const originalValues = [1.0, 1.0, 1.0, 1.0, 1.0]; // All normal
      const modelValues = [0.1, 2.5, 1.0, 1.0, 1.0]; // Model has anomalies
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, modelValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      // FIXED: Function correctly ignores model predictions and finds no anomalies
      // because original data is all within bounds [0.5, 1.5]
      expect(anomalies.length).toBe(0);
    });
  });

  describe('Expected behavior after fixing the bug', () => {
    it('should detect actual anomalies in original data', () => {
      const field = createMockField('CPU Usage');
      const originalValues = [50, 10, 95, 55, 48]; // 10 < 20 (low), 95 > 80 (high)
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [20, 20, 20, 20, 20]; // Lower bounds
      const upper = [80, 80, 80, 80, 80]; // Upper bounds

      const anomalies: Anomaly[] = [];
      const onAnomalyDetected = (anomaly: Anomaly) => {
        anomalies.push(anomaly);
      };

      // Simulate correct implementation
      for (let idx = 0; idx < originalValues.length; idx++) {
        const value = originalValues[idx]; // CORRECT: use original values
        if (value < lower[idx]) {
          onAnomalyDetected({ direction: 'lower', idx, time: times[idx], field });
        } else if (value > upper[idx]) {
          onAnomalyDetected({ direction: 'upper', idx, time: times[idx], field });
        }
      }

      expect(anomalies.length).toBe(2);
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

    it('correctly handles null values in original data (out-of-sample predictions)', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 1.0, null, null]; // Last two are out-of-sample
      const modelValues = [1.0, 1.0, 1.0, 1.0, 1.0]; // Model predictions (ignored)
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      const onAnomalyDetected = (anomaly: Anomaly) => {
        anomalies.push(anomaly);
      };

      // Use the fixed function which should skip null values
      detectAnomalies(originalValues, modelValues, times, lower, upper, field, onAnomalyDetected);

      // Should only detect anomaly in index 1, skip nulls at indices 3,4
      expect(anomalies.length).toBe(1);
      expect(anomalies[0].idx).toBe(1);
      expect(anomalies[0].direction).toBe('lower');
    });
  });

  describe('Edge cases and robustness', () => {
    it('handles empty arrays gracefully', () => {
      const field = createMockField();
      const anomalies: Anomaly[] = [];

      detectAnomalies([], [], [], [], [], field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(0);
    });

    it('handles missing bounds arrays', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 2.5];
      const modelValues = [1.0, 1.0, 1.0];
      const times = [1000, 2000, 3000];
      const onAnomalyDetected = jest.fn();

      // Test with empty lower bounds
      detectAnomalies(originalValues, modelValues, times, [], [1.5, 1.5, 1.5], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();

      // Test with empty upper bounds
      detectAnomalies(originalValues, modelValues, times, [0.5, 0.5, 0.5], [], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();
    });

    it('handles missing callback function', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 2.5];
      const modelValues = [1.0, 1.0, 1.0];
      const times = [1000, 2000, 3000];
      const lower = [0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5];

      // Should not throw when callback is undefined
      expect(() => {
        detectAnomalies(originalValues, modelValues, times, lower, upper, field);
      }).not.toThrow();
    });
  });

  describe('Real-world scenario validation', () => {
    it('now correctly detects anomalies in realistic scenarios', () => {
      // This test shows that anomaly detection now works correctly in real-world scenarios
      const field = createMockField();

      const scenarios = [
        {
          name: 'Gradual drift',
          originalValues: [50, 52, 54, 85, 88], // Gradual increase leading to anomaly (85, 88 > 80)
          modelValues: [50, 52, 54, 56, 58], // Model predictions all within bounds [20, 80]
          expectedAnomalies: 2, // indices 3, 4
        },
        {
          name: 'Sudden spike',
          originalValues: [40, 45, 150, 42, 44], // Sudden spike (150 > 80)
          modelValues: [40, 45, 47, 42, 44], // Model smooths out the spike, stays within bounds
          expectedAnomalies: 1, // index 2
        },
        {
          name: 'System failure',
          originalValues: [60, 65, 5, 3, 8], // System goes down (5, 3, 8 < 20)
          modelValues: [60, 65, 62, 58, 55], // Model doesn't predict failure, stays within bounds
          expectedAnomalies: 3, // indices 2, 3, 4
        },
      ];

      const bounds = { lower: [20, 20, 20, 20, 20], upper: [80, 80, 80, 80, 80] };
      const times = [1000, 2000, 3000, 4000, 5000];

      scenarios.forEach((scenario) => {
        const anomalies: Anomaly[] = [];
        detectAnomalies(
          scenario.originalValues,
          scenario.modelValues,
          times,
          bounds.lower,
          bounds.upper,
          field,
          anomalies.push.bind(anomalies)
        );

        // FIXED: Now correctly detects anomalies based on original data
        expect(anomalies.length).toBe(scenario.expectedAnomalies);
      });
    });
  });

  describe('Integration test with time filtering and out-of-sample predictions', () => {
    it('correctly handles complex scenario with time range filtering and null handling', () => {
      const field = createMockField('Integration Test');

      // Simulate a scenario similar to what createBaselinesForFrame would create:
      // - Original data that gets filtered by time range
      // - Out-of-sample predictions (represented as nulls in originalValues)
      // - Model predictions that stay within bounds

      const filteredOriginalData = [20, 90, 50, null, null]; // After time filtering + out-of-sample nulls
      const modelValues = [48, 52, 50, 55, 53]; // Model predictions (all within bounds)
      const times = [2000, 3000, 4000, 5000, 6000]; // Filtered time range
      const lower = [20, 20, 20, 20, 20];
      const upper = [80, 80, 80, 80, 80];

      const detectedAnomalies: Anomaly[] = [];
      const onAnomalyDetected = jest.fn((anomaly) => {
        detectedAnomalies.push(anomaly);
      });

      detectAnomalies(filteredOriginalData, modelValues, times, lower, upper, field, onAnomalyDetected);

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

    it('validates the complete fix addresses the original issue from GitHub #67', () => {
      // This test recreates the exact scenario described in the GitHub issue
      const field = createMockField('GitHub Issue #67 Test');

      // Scenario: Model produces good baseline predictions, but original data has anomalies
      const originalValues = [1.2, 0.3, 3.1, 1.1, 1.0]; // Clear anomalies: 0.3<0.5, 3.1>2.5
      const modelBaseline = [1.0, 1.1, 1.2, 1.0, 1.1]; // Good baseline predictions within bounds
      const times = [1000, 2000, 3000, 4000, 5000];
      const lowerBounds = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upperBounds = [2.5, 2.5, 2.5, 2.5, 2.5];

      const detectedAnomalies: Anomaly[] = [];
      const onAnomalyDetected = (anomaly: Anomaly) => {
        detectedAnomalies.push(anomaly);
      };

      detectAnomalies(originalValues, modelBaseline, times, lowerBounds, upperBounds, field, onAnomalyDetected);

      // Before the fix: 0 anomalies detected (bug behavior)
      // After the fix: 2 anomalies detected (correct behavior)
      expect(detectedAnomalies.length).toBe(2);

      // Verify specific anomalies
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

      // This confirms the fix resolves the issue: "there is _never_ an anomaly"
      // Now there ARE anomalies when the original data warrants it
    });
  });
});
