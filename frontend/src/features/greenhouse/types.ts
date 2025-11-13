export type GreenhouseMethod = 'soil' | 'nft' | 'dwc'
export type Language = 'bg' | 'en'

export type GreenhouseConfig = {
  id: string
  name: string
  method: GreenhouseMethod
  plantType: string
  cropId?: string
  variety?: string
  growthStage?: string
  language: Language
  timelapse: {
    enabled: boolean
    hour: number
  }
}
