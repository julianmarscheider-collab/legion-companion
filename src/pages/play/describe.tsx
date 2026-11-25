import type { ReactNode } from 'react';
import type { GameCatalog, GameEvent, Placement } from '../../game/engine';

/** Turns engine events into instructions for the players. */
export function describe(e: GameEvent, cat: GameCatalog): { title: string; lines: ReactNode[]; tone: string; tileId?: string } {
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
    const where = p.markerLabel
      ? onTile + (onTile ? `, marker ${p.markerLabel}` : ` on marker ${p.markerLabel}`)
      : onTile
        ? ` anywhere${onTile}`
        : ' anywhere on this tile';
    const setup = `Objective “${o?.name}”${where}: ${o?.setup || 'place the objective.'}`;
    return o?.flavour?.trim()
      ? [<em key={`${p.objectiveId}-flavour`} className="flavour">{o.flavour.trim()}</em>, setup]
      : [setup];
  };

  switch (e.kind) {
    case 'start':
      return {
        title: 'Set up the game',
        tone: 'info',
        tileId: e.tileId,
        lines: [
          `Place the starting tile: ${tile(e.tileId)}. Heroes start here.`,
          ...tileRules(e.tileId),
          cat.mission.description,
          ...e.placements.flatMap((p) => placement(p, e.tileId)),
        ].filter(Boolean),
      };
    case 'round':
      return { title: `Round ${e.round}`, tone: 'info', lines: ['All heroes ready their activation tokens.', 'The activation deck has been reshuffled.'] };
    case 'hero':
      return { title: 'Hero activation', tone: 'hero', lines: ['One hero with a ready activation token takes their turn.'] };
    case 'activate':
      return { title: 'Enemy activation', tone: 'enemy', lines: e.tileIds.map((id) => `Activate all enemies on ${tile(id)}.`) };
    case 'spawn': {
      const lines = e.tileIds.map((id) => {
        const here = e.spawns.filter((s) => s.tileId === id);
        return here.length
          ? `${tile(id)}: spawn ${here.map((s) => `${s.count} × ${unit(s.unitId)}`).join(' and ')}.`
          : `${tile(id)}: no miniatures available, nothing spawns.`;
      });
      return {
        title: 'Spawn!',
        tone: 'spawn',
        lines: [
          ...(e.replacedActivation ? [<em key="replaced">No enemies on the board, so the enemy activation becomes a spawn.</em>] : []),
          ...lines,
        ],
      };
    }
    case 'tile':
      return {
        title: 'Explore',
        tone: 'info',
        tileId: e.tileId,
        lines: [`Place ${tile(e.tileId)} where the heroes left the board.`, ...tileRules(e.tileId), ...e.placements.flatMap((p) => placement(p, e.tileId))],
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
          ...(revealed.length ? [<strong key="new">New objective revealed!</strong>] : []),
          ...revealed.flatMap((p) => placement(p)),
        ],
      };
    }
  }
}
