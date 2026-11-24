import Dexie, { type Table } from 'dexie';
import type { Ability, EnemyList, MapSet, MapTile, Mission, Objective, Unit } from '../domain/types';
import type { SavedGame } from './savedGame';

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: number;
}

// Local development database (IndexedDB). Only the repositories in
// repositories.ts touch this, so it can be swapped for an online backend.
export class LocalDb extends Dexie {
  users!: Table<UserRecord, string>;
  units!: Table<Unit, string>;
  abilities!: Table<Ability, string>;
  enemyLists!: Table<EnemyList, string>;
  objectives!: Table<Objective, string>;
  missions!: Table<Mission, string>;
  mapTiles!: Table<MapTile, string>;
  mapSets!: Table<MapSet, string>;
  games!: Table<SavedGame, string>;

  constructor() {
    // Internal database name: kept from the app's earlier name so existing data stays.
    super('tabletop-companion');
    this.version(1).stores({
      users: 'id, &username',
      units: 'id, ownerId',
      abilities: 'id, ownerId',
      enemyLists: 'id, ownerId',
      objectives: 'id, ownerId',
      missions: 'id, ownerId',
      mapTiles: 'id, ownerId',
      mapSets: 'id, ownerId',
      games: 'id, ownerId',
    });
  }
}

export const db = new LocalDb();
