import type { Objective } from './types';

/** Marker type the objective is placed on, or '' when it goes on a random tile. */
export function objectiveMarkerType(o: Objective): string {
  return o.placement === 'tile' || o.placement === 'none' ? '' : o.markerType.trim();
}

/** All questline names used by these objectives, sorted. */
export function questlinesOf(objectives: Objective[]): string[] {
  return [...new Set(objectives.map((o) => (o.questline ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

/** Short description of where an objective goes, e.g. "Altar marker" or "objective location". */
export function placementLabel(o: Objective): string {
  if (o.placement === 'none') return 'not on the map';
  const type = objectiveMarkerType(o);
  return type ? `${type} marker` : 'objective location';
}
