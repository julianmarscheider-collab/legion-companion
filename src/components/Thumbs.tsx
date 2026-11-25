import { useEffect, useState, type ReactNode } from 'react';
import type { MapTile, Unit } from '../domain/types';

/** An image that opens large in an overlay when tapped. */
function Zoomable({ src, caption, className, children }: { src: string; caption: string; className: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={`zoomable ${className}`}
        aria-label={`Show image: ${caption}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <img src={src} alt="" />
        {children}
      </button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)} role="dialog" aria-label={caption}>
          <figure className="zoomed">
            <img src={src} alt={caption} />
            <figcaption>{caption}</figcaption>
          </figure>
        </div>
      )}
    </>
  );
}

/**
 * Square tile thumbnail with the tile number in a framed badge in the middle.
 * Without an image the badge sits on a plain square, so tiles always look alike.
 * Sizes: small 48px (lists), medium 64px, large 112px (cards).
 */
export function TileThumb({ tile, size = 'small', zoom = true }: { tile: MapTile; size?: 'small' | 'medium' | 'large'; zoom?: boolean }) {
  const badge = <span className="tile-badge">{tile.code}</span>;
  const cls = `tile-thumb tile-${size}`;
  if (!tile.photos[0]) return <div className={`${cls} placeholder`}>{badge}</div>;
  // Inside clickable list rows: plain image (a button can't contain another button).
  if (!zoom)
    return (
      <div className={`zoomable static ${cls}`}>
        <img src={tile.photos[0]} alt="" />
        {badge}
      </div>
    );
  return (
    <Zoomable src={tile.photos[0]} caption={`Tile ${tile.code} – ${tile.name}`} className={cls}>
      {badge}
    </Zoomable>
  );
}

export function UnitThumb({ unit }: { unit: Unit }) {
  if (!unit.photos[0]) return <div className="thumb placeholder" />;
  return <Zoomable src={unit.photos[0]} caption={unit.name} className="thumb" />;
}
