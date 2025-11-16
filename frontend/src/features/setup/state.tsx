import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

export type LanguageOption = 'bg' | 'en';

export type NotificationSettings = {
  email: boolean;
  push: boolean;
};

export type SetupProfile = {
  setupCompleted: boolean;
  language?: LanguageOption;
  cropId?: string;
  variety?: string;
  plantType?: string;
  notifications?: NotificationSettings;
  currentGreenhouseId?: string;
};

export type WizardStep = 0 | 1 | 2 | 3;

export type BoundedMetric = {
  min: number;
  max: number;
};

export type CropStage = {
  id: string;
  label?: string;
  cues?: string[];
  guidance?: string;
};

export type CropDefaults = {
  cropId: string;
  variety: string;
  lang: string;
  displayName: string | null;
  overview: string | null;
  defaults?: {
    environment?: {
      temperature_day?: string;
      temperature_night?: string;
      humidity?: string;
      light_hours?: string;
    };
    irrigation?: {
      method?: string;
      frequency?: string;
      notes?: string;
    };
    container?: {
      volume_liters?: string;
      diameter_cm?: string;
      depth_cm?: string;
    };
    operations?: Record<string, unknown>;
  };
  safety_bounds?: {
    temperature_c?: BoundedMetric;
    humidity_pct?: BoundedMetric;
    light_hours?: BoundedMetric;
  };
  stages: CropStage[];
};

export type WizardSelection = {
  cropId?: string;
  cropLabel?: string;
  variety?: string;
  varietyLabel?: string;
  defaults?: CropDefaults;
};

export type WizardPreferences = {
  lightHours: number | null;
  temperatureCeiling: number | null;
  humidityTarget: number | null;
  notifications: NotificationSettings;
};

export type SetupWizardState = {
  step: WizardStep;
  selection: WizardSelection;
  prefs: WizardPreferences;
};

const STORAGE_KEY = 'tg-setup-v1';
const TOTAL_STEPS = 4;

const DEFAULT_STATE: SetupWizardState = {
  step: 0,
  selection: {},
  prefs: {
    lightHours: null,
    temperatureCeiling: null,
    humidityTarget: null,
    notifications: { email: false, push: false },
  },
};

const hasWindow = () => typeof window !== 'undefined' && 'localStorage' in window;

const clampStep = (value: number): WizardStep => {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(TOTAL_STEPS - 1, Math.max(0, Math.trunc(value))) as WizardStep;
};

const readState = (): Partial<SetupWizardState> => {
  if (!hasWindow()) {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SetupWizardState>) : {};
  } catch {
    return {};
  }
};

const writeState = (state: SetupWizardState) => {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures
  }
};

const hydrateState = (): SetupWizardState => {
  const persisted = readState();
  return {
    ...DEFAULT_STATE,
    ...persisted,
    step: clampStep(persisted.step ?? DEFAULT_STATE.step),
    selection: {
      ...DEFAULT_STATE.selection,
      ...persisted.selection,
    },
    prefs: {
      ...DEFAULT_STATE.prefs,
      ...persisted.prefs,
      notifications: {
        ...DEFAULT_STATE.prefs.notifications,
        ...persisted.prefs?.notifications,
      },
    },
  };
};

type WizardContextValue = {
  state: SetupWizardState;
  setState: Dispatch<SetStateAction<SetupWizardState>>;
  reset: () => void;
};

const SetupWizardContext = createContext<WizardContextValue | null>(null);

export const SetupWizardProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SetupWizardState>(() => hydrateState());

  useEffect(() => {
    writeState(state);
  }, [state]);

  const reset = () => {
    setState(DEFAULT_STATE);
    writeState(DEFAULT_STATE);
  };

  const value = useMemo(
    () => ({
      state,
      setState,
      reset,
    }),
    [state],
  );

  return <SetupWizardContext.Provider value={value}>{children}</SetupWizardContext.Provider>;
};

export const useSetupWizard = () => {
  const context = useContext(SetupWizardContext);
  if (!context) {
    throw new Error('useSetupWizard must be used within SetupWizardProvider');
  }
  return context;
};

export const isStepValid = (state: SetupWizardState, step: WizardStep): boolean => {
  switch (step) {
    case 0:
      return true;
    case 1:
      return Boolean(
        state.selection.cropId &&
          state.selection.variety &&
          state.selection.defaults &&
          state.selection.defaults.overview,
      );
    case 2:
      return (
        typeof state.prefs.lightHours === 'number' &&
        typeof state.prefs.temperatureCeiling === 'number' &&
        typeof state.prefs.humidityTarget === 'number'
      );
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
