import { Label, Select, TextInput, ToggleSwitch } from 'flowbite-react'
import type { ChangeEvent } from 'react'
import type { GreenhouseConfig } from '../types'

type GreenhouseFormFieldsProps = {
  value: GreenhouseConfig
  onChange: (value: GreenhouseConfig) => void
  disabled?: boolean
}

const methodOptions = [
  { value: 'soil', label: 'Soil beds' },
  { value: 'nft', label: 'NFT (Nutrient Film Technique)' },
  { value: 'dwc', label: 'DWC (Deep Water Culture)' },
]

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'bg', label: 'Български' },
]

export const GreenhouseFormFields = ({
  value,
  onChange,
  disabled = false,
}: GreenhouseFormFieldsProps) => {
  const updateField = <K extends keyof GreenhouseConfig>(field: K, next: GreenhouseConfig[K]) => {
    onChange({ ...value, [field]: next })
  }

  const updateTimelapse = (
    partial: Partial<GreenhouseConfig['timelapse']>,
  ) => {
    onChange({
      ...value,
      timelapse: {
        ...value.timelapse,
        ...partial,
      },
    })
  }

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateField('name', event.target.value)
  }

  const handlePlantTypeChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateField('plantType', event.target.value)
  }

  const handleMethodChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateField('method', event.target.value as GreenhouseConfig['method'])
  }

  const handleLanguageChange = (event: ChangeEvent<HTMLSelectElement>) => {
    updateField('language', event.target.value as GreenhouseConfig['language'])
  }

  const handleTimelapseHourChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value)
    if (Number.isNaN(raw)) {
      updateTimelapse({ hour: 0 })
      return
    }

    const clamped = Math.min(23, Math.max(0, raw))
    updateTimelapse({ hour: clamped })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="greenhouse-name" value="Greenhouse name" />
        <TextInput
          id="greenhouse-name"
          value={value.name}
          onChange={handleNameChange}
          disabled={disabled}
          required
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="greenhouse-method" value="Growing method" />
          <Select
            id="greenhouse-method"
            value={value.method}
            onChange={handleMethodChange}
            disabled={disabled}
          >
            {methodOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="greenhouse-language" value="Language" />
          <Select
            id="greenhouse-language"
            value={value.language}
            onChange={handleLanguageChange}
            disabled={disabled}
          >
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="greenhouse-plant-type" value="Primary plant type" />
        <TextInput
          id="greenhouse-plant-type"
          value={value.plantType}
          onChange={handlePlantTypeChange}
          disabled={disabled}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900">Timelapse capture</p>
            <p className="text-xs text-slate-500">Enable automatic photo capture every day.</p>
          </div>
          <ToggleSwitch
            checked={value.timelapse.enabled}
            onChange={(checked) => updateTimelapse({ enabled: checked })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="greenhouse-timelapse-hour" value="Capture hour (0 - 23)" />
          <TextInput
            id="greenhouse-timelapse-hour"
            type="number"
            min={0}
            max={23}
            value={value.timelapse.hour}
            onChange={handleTimelapseHourChange}
            disabled={disabled || !value.timelapse.enabled}
          />
        </div>
      </div>
    </div>
  )
}
