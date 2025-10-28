export const palette = {
  evergreen: '#1F6F4A',
  evergreenDark: '#18573A',
  night: '#0D1A14',
  forest: '#143024',
  sage: '#E9F5EE',
  sageSoft: '#F4FAF6',
  sageVeil: '#F8FCF8',
  moss: '#4FA071',
  mossSoft: '#4FA07126',
  soil: '#6B4F3B',
  soil80: '#6B4F3BCC',
  soil70: '#6B4F3BB3',
  soil60: '#6B4F3B99',
  sunlight: '#F6C445',
  sunlightSoft: '#F6C44533',
  sunlightGlow: '#F6C44540',
  chili: '#D4472B',
  chiliSoft: '#D4472B33',
  card: '#FFFFFFF0',
  evergreenShadow: '#1F6F4A1A',
} as const

export type PaletteColor = keyof typeof palette

export function alpha(hex: string, opacity: number) {
  const normalized = hex.replace('#', '')

  if (normalized.length !== 6) {
    throw new Error(`alpha() expects a 6-digit hex value. Received "${hex}"`)
  }

  const bigint = Number.parseInt(normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255

  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
