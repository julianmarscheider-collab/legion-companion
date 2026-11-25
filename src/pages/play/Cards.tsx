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
  const tile = d.tileId ? cat.tiles.find((t) => t.id === d.tileId) : undefined;
  return (
    <article className={`play-card tone-${d.tone} ${small ? 'small' : ''} ${glow ? 'glow' : ''}`}>
      <header className="play-card-band">{TYPE_LABEL[event.kind]}</header>
      <div className="play-card-body">
        <h2>{d.title}</h2>
        {tile && <TileThumb tile={tile} size="large" />}
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
