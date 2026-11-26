import type { Table } from 'dexie';
import type { Ability, DifficultyPreset, EnemyList, Entity, MapSet, MapTile, Mission, Objective, Unit } from '../domain/types';
import { db } from './db';
import type { SavedGame } from './savedGame';

/**
 * Storage interface used by the whole app. To move to an online database,
 * write another implementation of this (e.g. backed by Supabase or a REST
 * API) and change the exports at the bottom of this file.
 */
export interface Repository<T extends Entity> {
  list(ownerId: string): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  put(item: T): Promise<void>;
  delete(id: string): Promise<void>;
  /** Called whenever the collection changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void;
}

class DexieRepository<T extends Entity> implements Repository<T> {
  private listeners = new Set<() => void>();
  constructor(private table: Table<T, string>) {}

  list(ownerId: string) {
    return this.table.where('ownerId').equals(ownerId).sortBy('createdAt');
  }
  get(id: string) {
    return this.table.get(id);
  }
  async put(item: T) {
    await this.table.put({ ...item, updatedAt: Date.now() });
    this.emit();
  }
  async delete(id: string) {
    await this.table.delete(id);
    this.emit();
  }
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }
}

export const repos = {
  units: new DexieRepository<Unit>(db.units),
  abilities: new DexieRepository<Ability>(db.abilities),
  enemyLists: new DexieRepository<EnemyList>(db.enemyLists),
  objectives: new DexieRepository<Objective>(db.objectives),
  missions: new DexieRepository<Mission>(db.missions),
  mapTiles: new DexieRepository<MapTile>(db.mapTiles),
  mapSets: new DexieRepository<MapSet>(db.mapSets),
  games: new DexieRepository<SavedGame>(db.games),
  difficultyPresets: new DexieRepository<DifficultyPreset>(db.difficultyPresets),
};

export function newId(): string {
  return crypto.randomUUID();
}

export function newEntity(ownerId: string): Entity {
  const now = Date.now();
  return { id: newId(), ownerId, createdAt: now, updatedAt: now };
}
