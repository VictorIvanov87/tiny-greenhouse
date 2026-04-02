import type { AlertRule } from '../../../notifications/api';
import type { CropDefaults } from '../../state';

export const generateDefaultAlarms = (defaults: CropDefaults): AlertRule[] => {
  const bounds = defaults.safety_bounds;
  const rules: AlertRule[] = [];

  if (bounds?.temperature_c) {
    rules.push({
      id: 'default-temp-high',
      metric: 'temperature',
      condition: 'above',
      value: bounds.temperature_c.max,
      enabled: true,
    });
    rules.push({
      id: 'default-temp-low',
      metric: 'temperature',
      condition: 'below',
      value: bounds.temperature_c.min,
      enabled: true,
    });
  }

  if (bounds?.humidity_pct) {
    rules.push({
      id: 'default-humidity-low',
      metric: 'humidity',
      condition: 'below',
      value: bounds.humidity_pct.min,
      enabled: true,
    });
    rules.push({
      id: 'default-humidity-high',
      metric: 'humidity',
      condition: 'above',
      value: bounds.humidity_pct.max,
      enabled: true,
    });
  }

  rules.push({
    id: 'default-soil-low',
    metric: 'soilMoisture',
    condition: 'below',
    value: 40,
    enabled: true,
  });

  return rules;
};
