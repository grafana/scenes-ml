jest.mock('@bsull/augurs', () => {});
jest.mock('@bsull/augurs-prophet-wasmstan', () => {});

import { FieldType } from '@grafana/data';
import { detectAnomalies, Anomaly } from '../SceneBaseliner';

describe('detectAnomalies', () => {
  const createMockField = (name = 'Value') => ({
    name,
    type: FieldType.number,
    values: [],
    config: {},
  });

  describe('comparing original values against bounds', () => {
    it('detects anomalies in original data', () => {
      const field = createMockField();
      const originalValues = [1.0, 0.1, 2.5, 1.0, 1.0]; // 0.1 < 0.5, 2.5 > 1.5
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies).toEqual([
        expect.objectContaining({ direction: 'lower', idx: 1, time: 2000 }),
        expect.objectContaining({ direction: 'upper', idx: 2, time: 3000 }),
      ]);
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
      expect(anomalies[0].direction).toBe('lower');
      expect(anomalies[1].direction).toBe('upper');
      expect(anomalies[2].direction).toBe('lower');
      expect(anomalies[3].direction).toBe('upper');
    });

    it('reports no anomalies when all data is within bounds', () => {
      const field = createMockField();
      const anomalies: Anomaly[] = [];
      detectAnomalies([1.0, 1.0, 1.0], [1000, 2000, 3000], [0.5, 0.5, 0.5], [1.5, 1.5, 1.5], field, anomalies.push.bind(anomalies));
      expect(anomalies.length).toBe(0);
    });
  });

  describe('time range filtering', () => {
    it('only reports anomalies within the time range', () => {
      const field = createMockField();
      // Anomalies at times 1000, 3000, 5000 but range is [2000, 4000]
      const originalValues = [0.1, 1.0, 0.1, 1.0, 0.1];
      const times = [1000, 2000, 3000, 4000, 5000];
      const lower = [0.5, 0.5, 0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies), { from: 2000, to: 4000 });

      expect(anomalies.length).toBe(1);
      expect(anomalies[0]).toMatchObject({ idx: 2, time: 3000, direction: 'lower' });
    });

    it('includes anomalies at range boundaries', () => {
      const field = createMockField();
      const originalValues = [0.1, 1.0, 0.1];
      const times = [1000, 2000, 3000];
      const lower = [0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies), { from: 1000, to: 3000 });

      expect(anomalies.length).toBe(2);
      expect(anomalies[0].time).toBe(1000);
      expect(anomalies[1].time).toBe(3000);
    });

    it('reports all anomalies when no time range is given', () => {
      const field = createMockField();
      const originalValues = [0.1, 0.1, 0.1];
      const times = [1000, 2000, 3000];
      const lower = [0.5, 0.5, 0.5];
      const upper = [1.5, 1.5, 1.5];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(3);
    });
  });

  describe('data with gaps (irregular timestamps)', () => {
    it('compares each data point against its own bound regardless of gaps', () => {
      const field = createMockField();
      // Data at times [0, 1, 3] — gap at time 2.
      // In-sample bounds correspond 1:1: lower[i]/upper[i] matches y[i].
      const originalValues = [1.0, 1.0, 5.0]; // 5.0 > upper[2]=2
      const times = [0, 1, 3];
      const lower = [0, 0, 0];
      const upper = [2, 2, 2];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(1);
      expect(anomalies[0]).toMatchObject({ direction: 'upper', idx: 2, time: 3 });
    });

    it('filters gap data by time range correctly', () => {
      const field = createMockField();
      // Data at times [0, 1, 3, 7] — gaps at 2, 4, 5, 6
      // Anomalies at all points, but range [2, 6] only includes times 3
      const originalValues = [99, 99, 99, 99];
      const times = [0, 1, 3, 7];
      const lower = [0, 0, 0, 0];
      const upper = [2, 2, 2, 2];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, lower, upper, field, anomalies.push.bind(anomalies), { from: 2, to: 6 });

      expect(anomalies.length).toBe(1);
      expect(anomalies[0]).toMatchObject({ idx: 2, time: 3 });
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
      const onAnomalyDetected = jest.fn();
      detectAnomalies([1.0], [1000], [], [1.5], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();
      detectAnomalies([1.0], [1000], [0.5], [], field, onAnomalyDetected);
      expect(onAnomalyDetected).not.toHaveBeenCalled();
    });

    it('handles undefined bounds', () => {
      const field = createMockField();
      const onAnomalyDetected = jest.fn();
      detectAnomalies([1.0], [1000], undefined, [1.5], field, onAnomalyDetected);
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

    it('validates the fix for the original issue (GitHub #67)', () => {
      const field = createMockField();
      const originalValues = [1.2, 0.3, 3.1, 1.1, 1.0]; // 0.3 < 0.5, 3.1 > 2.5
      const times = [1000, 2000, 3000, 4000, 5000];

      const anomalies: Anomaly[] = [];
      detectAnomalies(originalValues, times, [0.5, 0.5, 0.5, 0.5, 0.5], [2.5, 2.5, 2.5, 2.5, 2.5], field, anomalies.push.bind(anomalies));

      expect(anomalies.length).toBe(2);
      expect(anomalies[0]).toMatchObject({ direction: 'lower', idx: 1, time: 2000 });
      expect(anomalies[1]).toMatchObject({ direction: 'upper', idx: 2, time: 3000 });
    });
  });
});
