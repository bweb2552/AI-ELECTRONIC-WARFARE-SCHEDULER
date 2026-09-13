export interface GeoRegion {
  id: string;
  name: string;
  lon: number;
  lat: number;
  label: string;
}

export const GEO_REGIONS: GeoRegion[] = [
  { id: 'north', name: 'North Region', lon: -100, lat: 55, label: 'NORTH' },
  { id: 'atlantic', name: 'Atlantic Region', lon: -30, lat: 35, label: 'ATLANTIC' },
  { id: 'european', name: 'European Region', lon: 15, lat: 48, label: 'EUROPEAN' },
  { id: 'middle', name: 'Middle Region', lon: 45, lat: 28, label: 'MIDDLE' },
  { id: 'east', name: 'East Region', lon: 110, lat: 35, label: 'EAST' },
  { id: 'pacific', name: 'Pacific Region', lon: 150, lat: 20, label: 'PACIFIC' },
  { id: 'southern', name: 'Southern Region', lon: 20, lat: -30, label: 'SOUTHERN' },
];

export const RECEIVER_POSITIONS = [
  { id: 'R1', regionId: 'european', lon: 10, lat: 50, label: 'RX-1' },
  { id: 'R2', regionId: 'east', lon: 105, lat: 32, label: 'RX-2' },
  { id: 'R3', regionId: 'atlantic', lon: -40, lat: 30, label: 'RX-3' },
];

export function getRegionForEmitter(emitterIndex: number): GeoRegion {
  return GEO_REGIONS[emitterIndex % GEO_REGIONS.length];
}

export function getRegionById(id: string): GeoRegion | undefined {
  return GEO_REGIONS.find(r => r.id === id);
}

export function lonLatToXY(lon: number, lat: number, width: number, height: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}
