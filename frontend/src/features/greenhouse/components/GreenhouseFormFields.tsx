import { Label, Select, TextInput } from 'flowbite-react'
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

  const handleTimelapseTimeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const [hh] = event.target.value.split(':')
    const hour = Number(hh)
    updateTimelapse({ hour: Number.isNaN(hour) ? 0 : hour })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="greenhouse-name">Greenhouse name</Label>
          <TextInput
            id="greenhouse-name"
            value={value.name}
            onChange={handleNameChange}
            disabled={disabled}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="greenhouse-plant-type">Primary plant type</Label>
          <TextInput
            id="greenhouse-plant-type"
            value={value.plantType}
            onChange={handlePlantTypeChange}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="greenhouse-method">Growing method</Label>
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
          <Label htmlFor="greenhouse-language">Language</Label>
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

      <div className="space-y-4 rounded-2xl border border-[#1f2a3d] p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-100">Timelapse capture</p>
            <p className="text-xs text-slate-400">Enable automatic photo capture every day.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={value.timelapse.enabled}
              disabled={disabled}
              onChange={(e) => updateTimelapse({ enabled: e.target.checked })}
            />
            <div className="peer relative h-6 w-11 rounded-full bg-gray-700 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-600 after:bg-white after:transition-all after:content-[''] peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-800 rtl:peer-checked:after:-translate-x-full" />
          </label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="greenhouse-timelapse-hour">Capture time</Label>
          <input
            id="greenhouse-timelapse-hour"
            type="time"
            value={`${String(value.timelapse.hour).padStart(2, '0')}:00`}
            onChange={handleTimelapseTimeChange}
            disabled={disabled || !value.timelapse.enabled}
            className="block w-full rounded-lg border border-gray-600 bg-gray-700 p-2.5 text-sm leading-none text-white focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  )
}
