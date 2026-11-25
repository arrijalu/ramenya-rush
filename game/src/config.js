// Game configuration and tuning for Ramen-ya Rush. Logical playfield: 1280x720.

export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const STATIONS = [
  { id: 'board', name: 'Order Board', x: 120, y: 180, width: 160, height: 180 },
  { id: 'broth', name: 'Broth Pots', x: 340, y: 320, width: 180, height: 160 },
  { id: 'noodles', name: 'Noodle Boiler', x: 570, y: 320, width: 150, height: 160 },
  { id: 'toppings', name: 'Toppings Counter', x: 770, y: 320, width: 220, height: 160 },
  { id: 'assembly', name: 'Assembly Bowl', x: 1030, y: 320, width: 160, height: 160 }
];

export const BROTHS = ['shoyu', 'miso', 'tonkotsu'];
export const TOPPINGS = ['chashu', 'ajitama', 'nori', 'menma', 'negi'];

export const BROTH_COLORS = {
  shoyu: '#4a2e18',
  miso: '#c4823d',
  tonkotsu: '#f5ebd6'
};

export const TOPPING_COLORS = {
  chashu: '#b85d41',
  ajitama: '#f4a261',
  nori: '#1d3557',
  menma: '#d4a373',
  negi: '#2a9d8f'
};

export const PALETTE = {
  backdrop: '#121212',
  wall: '#1e1411',
  woodDark: '#2c1810',
  woodCounter: '#7a431d',
  woodEdge: '#a0582a',
  vermilion: '#d90429',
  cream: '#fdf0d5',
  lanternGold: '#ffb703',
  text: '#f8f9fa',
  muted: '#adb5bd',
  steam: 'rgba(255, 255, 255, 0.35)',
  success: '#38b000',
  danger: '#d90429'
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'ramenya-rush.best';
