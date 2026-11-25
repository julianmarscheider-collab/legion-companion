import type { ReactNode } from 'react';
import type { GameCatalog, GameEvent, Placement } from '../../game/engine';

export interface TileRow {
  tileId: string;
  text: ReactNode;
}

export interface Described {
  title: string;
  tone: string;
  /** Shown before the tile rows (e.g. why a card was replaced). */
  notes?: ReactNode[];
  /** One row per tile, shown with the tile's image or number. */
  tileRows?: TileRow[];
  lines: ReactNode[];
}

/** Turns engine events into instructions for the players. */
export function describe(e: GameEvent, cat: GameCatalog): Described {
  const tile = (id: string) => {
    const t = cat.tiles.find((x) => x.id === id);
    return t ? `Tile ${t.code} (${t.name})` : 'Unknown tile';
  };
  // A tile's extra rules, shown as a highlighted box under the placement instruction.
  const tileRules = (id: string): ReactNode[] => {
    const rules = cat.tiles.find((x) => x.id === id)?.rules?.trim();
    return rules
      ? [
          <span key={`${id}-rules`} className="tile-rules">
            <strong>Tile rules:</strong> {rules}
          </span>,
        ]
      : [];
  };
  const unit = (id: string) => cat.units.find((u) => u.id === id)?.name ?? 'Unknown unit';
  // Flavour text (italic) first, then the setup instruction.
  const placement = (p: Placement, currentTile?: string): ReactNode[] => {
    const o = cat.objectives.find((x) => x.id === p.objectiveId);
    const onTile = p.tileId !== currentTile ? ` on ${tile(p.tileId)}` : '';
    // Without a marker the objective goes on the tile's printed objective location.
    const where = p.markerLabel
      ? onTile + (onTile ? `, marker ${p.markerLabel}` : ` on marker ${p.markerLabel}`)
      : onTile
        ? ` on the objective location of ${tile(p.tileId)}`
        : ' on the objective location of this tile';
    const fallback = p.markerLabel ? 'place an objective marker there.' : 'place an objective marker on the objective location.';
    const setup = `Objective “${o?.name}”${where}: ${o?.setup || fallback}`;
    return o?.flavour?.trim()
      ? [<em key={`${p.objectiveId}-flavour`} className="flavour">{o.flavour.trim()}</em>, setup]
      : [setup];
  };
  // Found before its prerequisite is completed: the "not fulfilled" texts, marked as locked.
  const lockedPlacement = (p: Placement, currentTile?: string): ReactNode[] => {
    const o = cat.objectives.find((x) => x.id === p.objectiveId);
    const pre = cat.objectives.find((x) => x.id === o?.revealedBy);
    const onTile = p.tileId !== currentTile ? ` on ${tile(p.tileId)}` : '';
    const where = p.markerLabel ? onTile + (onTile ? `, marker ${p.markerLabel}` : ` on marker ${p.markerLabel}`) : onTile;
    const text = o?.lockedText?.trim() || 'It can’t be completed yet.';
    return [
      ...(o?.lockedFlavour?.trim() ? [<em key={`${p.objectiveId}-lflavour`} className="flavour">{o.lockedFlavour.trim()}</em>] : []),
      <span key={`${p.objectiveId}-locked`} className="locked-objective">
        🔒 Objective “{o?.name}”{where} is locked (requires “{pre?.name}”): {text}
      </span>,
    ];
  };

  switch (e.kind) {
    case 'start':
      return {
        title: 'Set up the game',
        tone: 'info',
        tileRows: [{ tileId: e.tileId, text: `Place the starting tile: ${tile(e.tileId)}. Heroes start here.` }],
        lines: [
          ...tileRules(e.tileId),
          cat.mission.description,
          ...e.placements.flatMap((p) => placement(p, e.tileId)),
          ...(e.locked ?? []).flatMap((p) => lockedPlacement(p, e.tileId)),
        ].filter(Boolean),
      };
    case 'round':
      return { title: `Round ${e.round}`, tone: 'info', lines: ['All heroes ready their activation tokens.', 'The activation deck has been reshuffled.'] };
    case 'hero':
      return { title: 'Hero activation', tone: 'hero', lines: ['One hero with a ready activation token takes their turn.'] };
    case 'activate':
      return {
        title: 'Enemy activation',
        tone: 'enemy',
        notes: e.replacedSpawn ? [<em key="replaced">No miniatures left to spawn, so the spawn card activates a single tile instead.</em>] : [],
        tileRows: e.tileIds.map((id) => ({ tileId: id, text: `Activate all enemies on ${tile(id)}.` })),
        lines: [],
      };
    case 'spawn': {
      const tileRows = e.tileIds.map((id) => {
        const here = e.spawns.filter((s) => s.tileId === id);
        return {
          tileId: id,
          text: here.length
            ? `${tile(id)}: spawn ${here.map((s) => `${s.count} × ${unit(s.unitId)}`).join(' and ')}.`
            : `${tile(id)}: no miniatures available, nothing spawns.`,
        };
      });
      return {
        title: 'Spawn!',
        tone: 'spawn',
        notes: e.replacedActivation ? [<em key="replaced">No enemies on the board, so the enemy activation becomes a spawn.</em>] : [],
        tileRows,
        lines: [],
      };
    }
    case 'tile':
      return {
        title: 'Explore',
        tone: 'info',
        tileRows: [{ tileId: e.tileId, text: `Place ${tile(e.tileId)} where the heroes left the board.` }],
        lines: [
          ...tileRules(e.tileId),
          ...e.placements.flatMap((p) => placement(p, e.tileId)),
          ...(e.locked ?? []).flatMap((p) => lockedPlacement(p, e.tileId)),
        ],
      };
    case 'tileDeckEmpty':
      return { title: 'Explore', tone: 'info', lines: ['There are no map tiles left to explore.'] };
    case 'enemiesChanged':
      return {
        title: e.delta < 0 ? 'Enemies removed' : 'Enemies added',
        tone: 'muted',
        lines: [`${Math.abs(e.delta)} × ${unit(e.unitId)} ${e.delta < 0 ? 'removed from' : 'added to'} the board.`],
      };
    case 'objective': {
      const o = cat.objectives.find((x) => x.id === e.objectiveId);
      const revealed = e.revealed ?? [];
      return {
        title: e.completed ? 'Objective complete' : 'Objective reopened',
        tone: 'hero',
        lines: [
          o?.name ?? '',
          ...(revealed.length ? [<strong key="new">{revealed.length === 1 ? 'Objective unlocked!' : 'Objectives unlocked!'}</strong>] : []),
          ...revealed.flatMap((p) => placement(p)),
        ],
      };
    }
  }
}

/** Everything a description says, in reading order (for the plain-text log). */
export function describedText(d: Described): ReactNode[] {
  return [...(d.notes ?? []), ...(d.tileRows ?? []).map((r) => r.text), ...d.lines];
}
