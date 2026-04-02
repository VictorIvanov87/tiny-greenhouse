export type VarietyOption = {
  id: string;
  label: string;
  description: string;
  supported: boolean;
};

export type CropOption = {
  id: string;
  label: string;
  emoji: string;
  imageUrl?: string;
  description: string;
  supported: boolean;
  varieties: VarietyOption[];
};

export const CROP_LIBRARY: CropOption[] = [
  {
    id: 'chillies',
    label: 'Chillies',
    emoji: '🌶️',
    description: 'Compact heat lovers suited for balconies or small rigs.',
    supported: true,
    varieties: [
      {
        id: 'basket-of-fire',
        label: 'Basket of Fire',
        description: 'Trailing compact plants bred for baskets.',
        supported: true,
      },
      {
        id: 'prairie-fire',
        label: 'Prairie Fire',
        description: 'Windowsill ornamental with multi-color pods.',
        supported: true,
      },
    ],
  },
  {
    id: 'basil',
    label: 'Basil',
    emoji: '🌿',
    description: 'Leafy herbs that prefer even moisture and pruning.',
    supported: true,
    varieties: [
      {
        id: 'genovese',
        label: 'Genovese',
        description: 'Classic sweet basil — tender leaves and fast rebounds.',
        supported: true,
      },
    ],
  },
  {
    id: 'mushrooms',
    label: 'Mushrooms',
    emoji: '🍄',
    description: 'Humidity-forward fruiting blocks (coming soon).',
    supported: false,
    varieties: [
      { id: 'oyster', label: 'Oyster', description: 'Fruiting blocks', supported: false },
      { id: 'shiitake', label: 'Shiitake', description: 'Logs & blocks', supported: false },
    ],
  },
];

export const findCrop = (cropId?: string) => CROP_LIBRARY.find((crop) => crop.id === cropId);

export const findVariety = (cropId?: string, varietyId?: string) =>
  findCrop(cropId)?.varieties.find((variety) => variety.id === varietyId);
