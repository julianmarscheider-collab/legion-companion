import type { MapTile, TileMarker } from './types';

/** A marker's name. Older markers had a label ("A") and a type ("Altar"): the type is the name then. */
export function markerName(m: TileMarker): string {
  return (m.type?.trim() || m.label).trim();
}

/** All marker names used on these tiles, sorted. */
export function markerNamesOf(tiles: MapTile[]): string[] {
  return [...new Set(tiles.flatMap((t) => t.markers.map(markerName)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
