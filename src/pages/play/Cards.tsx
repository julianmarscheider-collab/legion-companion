import { forwardRef } from 'react';
import { TileThumb } from '../../components/Thumbs';
import type { GameCatalog, GameEvent } from '../../game/engine';
import { describe } from './describe';

/** Events that come from drawing a card off one of the piles. */
export const isDrawnCard = (e: GameEvent) => ['hero', 'activate', 'spawn', 'tile', 'tileDeckEmpty'].includes(e.kind);

const TYPE_LABEL: Record<GameEvent['kind'], string> = {
  start: 'Setup',
  round: 'New round',
  hero: 'Hero',
  activate: 'Enemies',
  spawn: 'Spawn',
  tile: 'Explore',
  tileDeckEmpty: 'Explore',
  enemiesChanged: 'Enemies',
  objective: 'Objective',
};

/** Back of a card; `kind` picks the activation or the map tile design. */
export function CardBack({ kind }: { kind: 'activation' | 'tiles' }) {
  return (
    <div className={`card-back ${kind}`}>
      <div className="card-back-inner">
        <img src="./icon.svg" alt="" />
      </div>
    </div>
  );
}

/** A face-up card for one game event. `glow`: just drawn, so it glows softly for a moment. */
export function PlayCard({ event, cat, small, glow }: { event: GameEvent; cat: GameCatalog; small?: boolean; glow?: boolean }) {
  const d = describe(event, cat);
  // One tile (explore, setup): a bigger picture. Several (activation, spawn): compact rows.
  const thumbSize = (d.tileRows?.length ?? 0) === 1 && (event.kind === 'tile' || event.kind === 'start') ? 'large' : 'medium';
  return (
    <article className={`play-card tone-${d.tone} ${small ? 'small' : ''} ${glow ? 'glow' : ''}`}>
      <header className="play-card-band">{TYPE_LABEL[event.kind]}</header>
      <div className="play-card-body">
        <h2>{d.title}</h2>
        {d.notes?.map((n, i) => (
          <p key={`n${i}`}>{n}</p>
        ))}
        {d.tileRows?.map((r, i) => {
          const tile = cat.tiles.find((t) => t.id === r.tileId);
          return (
            <div key={`t${i}`} className={`tile-row-line ${thumbSize}`}>
              {tile && <TileThumb tile={tile} size={thumbSize} />}
              <p>{r.text}</p>
            </div>
          );
        })}
        {d.lines.map((l, i) => (
          <p key={i}>{l}</p>
        ))}
      </div>
    </article>
  );
}

/** A pile of face-down cards. Thicker the more cards are left; click to draw. */
export const CardPile = forwardRef<
  HTMLDivElement,
  { kind: 'activation' | 'tiles'; label: string; count: number; note: string; disabled?: boolean; onDraw(): void }
>(function CardPile({ kind, label, count, note, disabled, onDraw }, topRef) {
  const layers = Math.min(Math.max(count, 1), 6) - 1;
  return (
    <button
      type="button"
      className={`pile ${kind} ${disabled ? 'empty' : ''}`}
      onClick={onDraw}
      disabled={disabled}
      aria-label={`${label}: draw a card (${note})`}
    >
      <div className="pile-stack">
        {Array.from({ length: layers }, (_, i) => (
          <div key={i} className="pile-layer" style={{ transform: `translate(${(layers - i) * 2}px, ${(layers - i) * 3}px)` }}>
            <CardBack kind={kind} />
          </div>
        ))}
        <div className="pile-top" ref={topRef}>
          <CardBack kind={kind} />
        </div>
      </div>
      <span className="pile-label">{label}</span>
      <span className="pile-note">{note}</span>
    </button>
  );
});

export type QuestState = 'open' | 'done' | 'locked' | 'unfound';

const QUEST_BAND: Record<QuestState, string> = {
  open: 'Objective',
  done: '✓ Completed',
  locked: '🔒 Locked',
  unfound: 'Not found yet',
};

/**
 * Small objective card for the sidebar. Tap it to show its details; found
 * objectives have a "Completed" tick, locked ones show what they require.
 */
export function QuestCard(p: {
  name: string;
  state: QuestState;
  /** e.g. "Tile 5 – Prison Cells, marker A" */
  where?: string;
  /** Name of the prerequisite, for locked objectives. */
  requires?: string;
  flavour?: string;
  text?: string;
  expanded: boolean;
  onToggle(): void;
  onComplete?(): void;
}) {
  const sub = p.state === 'locked' ? `requires “${p.requires}”` : p.state === 'unfound' ? 'Keep exploring' : p.where;
  return (
    <article className={`quest-card ${p.state} ${p.expanded ? 'expanded' : ''}`}>
      <header>{QUEST_BAND[p.state]}</header>
      <button type="button" className="quest-main" aria-expanded={p.expanded} onClick={p.onToggle}>
        <strong>{p.name}</strong>
        {sub && <small>{sub}</small>}
      </button>
      {p.expanded && (
        <div className="quest-details">
          {p.flavour && <p className="flavour">{p.flavour}</p>}
          {p.text && <p>{p.text}</p>}
        </div>
      )}
      {(p.state === 'open' || p.state === 'done') && p.onComplete && (
        <label className="quest-check">
          <input type="checkbox" checked={p.state === 'done'} onChange={p.onComplete} />
          <span>Completed</span>
        </label>
      )}
    </article>
  );
}
