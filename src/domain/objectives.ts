import type { Objective } from './types';

/** Marker type the objective is placed on, or '' when it goes on a random tile. */
export function objectiveMarkerType(o: Objective): string {
  return o.placement === 'tile' ? '' : o.markerType.trim();
}

/** Short description of where an objective goes, e.g. "Altar marker" or "random tile". */
export function placementLabel(o: Objective): string {
  const type = objectiveMarkerType(o);
  return type ? `${type} marker` : 'random tile';
}
