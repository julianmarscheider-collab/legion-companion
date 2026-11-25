import type { MapSet, MapTile } from './types';

/** Tiles of the set that are marked as starting tile (in set order). */
export function startTilesOf(set: MapSet, tiles: MapTile[]): MapTile[] {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  return set.tileIds.map((id) => byId.get(id)).filter((t): t is MapTile => !!t?.isStart);
}

/**
 * The tile a game starts on: the (first) tile marked as starting tile. Map sets
 * made before tiles could be marked fall back to the starting tile chosen in the set.
 */
export function startTileIdOf(set: MapSet, tiles: MapTile[]): string {
  const marked = startTilesOf(set, tiles)[0];
  if (marked) return marked.id;
  if (set.startTileId && set.tileIds.includes(set.startTileId)) return set.startTileId;
  return set.tileIds[0] ?? '';
}

/** A warning about the set's starting tile, or null if exactly one tile is marked. */
export function startTileWarning(set: MapSet, tiles: MapTile[]): string | null {
  if (!set.tileIds.length) return null;
  const marked = startTilesOf(set, tiles);
  if (marked.length > 1)
    return `This map set contains ${marked.length} starting tiles (${marked.map((t) => `Tile ${t.code}`).join(', ')}). Only one is used: remove the others from the set.`;
  if (marked.length === 0)
    return 'This map set has no tile marked as starting tile. Mark one under Map tiles and add it to the set.';
  return null;
}
