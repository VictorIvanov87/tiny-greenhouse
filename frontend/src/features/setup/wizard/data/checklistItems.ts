export type ChecklistItem = {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
};

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'soil',
    emoji: '🪴',
    title: 'Prepare your growing medium',
    subtitle: 'Fill your container with soil or substrate to the recommended depth.',
  },
  {
    id: 'seeds',
    emoji: '🌱',
    title: 'Plant your seeds',
    subtitle: 'Place seeds at the recommended spacing and depth for your chosen variety.',
  },
  {
    id: 'power',
    emoji: '🔌',
    title: 'Connect to power',
    subtitle: 'Plug in your Tiny Greenhouse unit and verify the LED indicator turns on.',
  },
  {
    id: 'sensors',
    emoji: '📡',
    title: 'Confirm sensor readings',
    subtitle: 'Check that temperature, humidity, and soil moisture values appear on the dashboard.',
  },
];

export const CHECKLIST_KEYS = CHECKLIST_ITEMS.map((item) => item.id);
