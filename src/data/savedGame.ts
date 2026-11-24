import type { Entity } from '../domain/types';
import type { GameCatalog, GameConfig, GameSnapshot } from '../game/engine';

export interface SavedGame extends Entity {
  name: string;
  config: GameConfig;
  catalog: GameCatalog;
  snapshot: GameSnapshot;
  /** Previous snapshots, newest last, for "go back one draw". */
  history: GameSnapshot[];
}
