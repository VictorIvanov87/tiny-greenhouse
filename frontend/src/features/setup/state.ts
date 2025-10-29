export type LanguageOption = 'bg' | 'en'
export type PlantTypeOption = 'basket-of-fire' | 'prairie-fire' | 'reaper' | 'mushroom-kit'
export type NotificationSettings = {
  email: boolean
  push: boolean
}

export type SetupProfile = {
  setupCompleted: boolean
  language?: LanguageOption
  plantType?: PlantTypeOption
  notifications?: NotificationSettings
  currentGreenhouseId?: string
}

export type SetupWizardData = {
  language: LanguageOption | null
  plantType: PlantTypeOption | null
  notifications: NotificationSettings
}

export type SetupCompletionPayload = {
  language: LanguageOption
  plantType: PlantTypeOption
  notifications: NotificationSettings
}

export const languageOptions: Array<{ value: LanguageOption; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'bg', label: 'Bulgarian' },
]

export const plantTypeOptions: Array<{ value: PlantTypeOption; label: string; description: string }> = [
  {
    value: 'basket-of-fire',
    label: 'Basket of Fire',
    description: 'Compact chili variety suited for hanging planters.',
  },
  {
    value: 'prairie-fire',
    label: 'Prairie Fire',
    description: 'Ornamental peppers that thrive in mixed greenhouse beds.',
  },
  {
    value: 'reaper',
    label: 'Carolina Reaper',
    description: 'High-heat cultivar that needs attentive temperature control.',
  },
  {
    value: 'mushroom-kit',
    label: 'Mushroom Kit',
    description: 'Humidity-forward setup for seasonal mushroom harvests.',
  },
]

export const defaultWizardData: SetupWizardData = {
  language: null,
  plantType: null,
  notifications: {
    email: true,
    push: false,
  },
}
