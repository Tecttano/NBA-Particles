
export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  colorPrimary: string;
  colorSecondary: string;
  logoUrl: string;
}

export type RegionType = 
  | 'logo' 
  | 'stats' 
  | 'players' 
  | 'none' 
  | 'arrow_next' 
  | 'arrow_prev'
  | 'back_home' // New region for back to grid
  | string; // Allow dynamic strings like 'team_0', 'player_0'

export interface Point {
  x: number;
  y: number;
  color32: number; // 32-bit integer color (ABGR format)
  region: RegionType;
}

export enum ParticleMode {
  GRAVITY = 'GRAVITY',
  SHAPE = 'SHAPE',
}
