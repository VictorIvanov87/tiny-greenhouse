export type WizardStep = 0 | 1 | 2 | 3;

export type CropKind = 'chillies' | 'lettuce' | 'strawberries';
export type Variety = 'variety-x' | 'variety-y' | 'variety-z';

export interface CropSelection {
  kind?: CropKind;
  variety?: Variety;
}

export type SupportedLanguage = 'en' | 'bg';
export type GrowingMethod = 'soil' | 'nft' | 'dwc';

export interface PreferenceSettings {
  lightHours?: number;
  soilMoistureLow?: number;
  tempHigh?: number;
  timelapseHour?: number;
  language?: SupportedLanguage;
  method?: GrowingMethod;
}

export interface SetupData {
  step: WizardStep;
  crop: CropSelection;
  prefs: PreferenceSettings;
}

const STORAGE_KEY = 'tg.setup.v1';
const TOTAL_STEPS = 4;

const clampStep = (value: number): WizardStep => {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(TOTAL_STEPS - 1, Math.max(0, Math.trunc(value))) as WizardStep;
};

const hasWindow = () => typeof window !== 'undefined' && 'localStorage' in window;

export const DEFAULT_SETUP: SetupData = {
  step: 0,
  crop: {},
  prefs: {
    lightHours: 12,
    soilMoistureLow: 30,
    tempHigh: 30,
    timelapseHour: 9,
    language: 'en',
    method: 'soil',
  },
};

export const load = (): Partial<SetupData> => {
  if (!hasWindow()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SetupData>) : {};
  } catch {
    return {};
  }
};

export const save = (state: SetupData) => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const reset = () => {
  if (!hasWindow()) {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};

export const hydrate = (): SetupData => {
  const persisted = load();
  return {
    ...DEFAULT_SETUP,
    ...persisted,
    step: clampStep(persisted.step ?? DEFAULT_SETUP.step),
    crop: {
      ...DEFAULT_SETUP.crop,
      ...persisted.crop,
    },
    prefs: {
      ...DEFAULT_SETUP.prefs,
      ...persisted.prefs,
    },
  };
};

export const isStepValid = (state: SetupData, step: WizardStep): boolean => {
  switch (step) {
    case 0:
      return true;
    case 1:
      return Boolean(state.crop?.kind && state.crop?.variety);
    case 2: {
      const prefs = state.prefs;
      const within = (
        value: number | undefined,
        min: number,
        max: number,
      ) => typeof value === 'number' && value >= min && value <= max;

      return (
        within(prefs.lightHours, 1, 24) &&
        within(prefs.soilMoistureLow, 0, 100) &&
        within(prefs.tempHigh, 5, 45) &&
        within(prefs.timelapseHour, 0, 23)
      );
    }
    case 3:
      return true;
    default:
      return false;
  }
};

export const getNextStep = (current: WizardStep): WizardStep =>
  Math.min(TOTAL_STEPS - 1, current + 1) as WizardStep;

export const getPreviousStep = (current: WizardStep): WizardStep =>
  Math.max(0, current - 1) as WizardStep;
