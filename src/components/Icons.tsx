/** Plus / minus drawn as shapes, so they are exactly centred in any font. */
export function PlusIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function MinusIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2.5 8h11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Circular arrow (round). */
export function RoundIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M12 1.8v2.9H9.1" />
    </svg>
  );
}

/** Plain square (map tile). */
export function TileIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="1" />
    </svg>
  );
}

/** Small skull (difficulty). */
export function SkullIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M8 1.2c-3.4 0-5.9 2.4-5.9 5.6 0 1.8.8 3.2 2 4.1v1.6c0 .7.5 1.2 1.2 1.2h5.4c.7 0 1.2-.5 1.2-1.2v-1.6c1.2-.9 2-2.3 2-4.1 0-3.2-2.5-5.6-5.9-5.6zM5.6 6.4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm4.8 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM8 9.4l-.9 1.5h1.8L8 9.4zM6.6 12.1v1.4h.8v-1.4h-.8zm2 0v1.4h.8v-1.4h-.8z"
      />
    </svg>
  );
}

/** Question mark for help buttons, drawn so it is centred in any font or heading. */
export function QuestionIcon() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.6 6.1a2.4 2.4 0 1 1 3.5 2.1c-.7.4-1.1.9-1.1 1.6v.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="8" cy="12.9" r="1.05" fill="currentColor" />
    </svg>
  );
}

/** Solid crown with a band (bosses). */
export function CrownIcon() {
  return (
    <svg className="icon crown" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 4.5l3.5 3L8 2.5l2.5 5 3.5-3-1.2 7.5H3.2z" fill="currentColor" />
      <rect x="3.2" y="12.6" width="9.6" height="1.6" rx="0.5" fill="currentColor" />
    </svg>
  );
}

/** Three square tiles fanned out like a hand of cards (map sets). The back two are covered by the front one. */
export function TileFanIcon() {
  const tile = (angle: number) => (
    <rect
      x="4.6" y="3.2" width="6.8" height="6.8" rx="0.6"
      transform={`rotate(${angle} 8 16)`}
      fill="var(--icon-fill, #1b1712)" stroke="currentColor" strokeWidth="1"
    />
  );
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true" strokeLinejoin="round">
      {tile(-20)}
      {tile(20)}
      {/* The front tile sits a little higher, so the three read as separate cards. */}
      <g transform="translate(0 -1.6)">{tile(0)}</g>
    </svg>
  );
}

/** Bone with knobbed ends, drawn as an outline: a coloured shape with a card-coloured inside. */
function OutlineBone({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const [px, py] = [(-(y2 - y1) / len) * 1.2, ((x2 - x1) / len) * 1.2];
  const knobs = [[x1, y1], [x2, y2]].flatMap(([x, y]) => [[x + px, y + py], [x - px, y - py]]);
  const layer = (color: string, width: number, r: number) => (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
      {knobs.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={r} fill={color} />)}
    </>
  );
  return (
    <>
      {layer('currentColor', 3.8, 2.3)}
      {layer('var(--icon-fill, #1b1712)', 1.8, 1.1)}
    </>
  );
}

/** Enemies: outlined skull (round top, slim jaw) over crossed bones, with open teeth. Different from the round difficulty skull. */
export function EnemySkullIcon() {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <OutlineBone x1={3.5} y1={3.5} x2={20.5} y2={20.5} />
      <OutlineBone x1={20.5} y1={3.5} x2={3.5} y2={20.5} />
      <g transform="translate(12 11.2) scale(0.95)">
        <path
          d="M0-7C-4.3-7 -6.80-4.2 -6.80-.6C-6.80 1.2 -5.80 2.3 -5.20 3L-3.60 3.9V6.6Q-3.60 7.5 -2.70 7.5H2.70Q3.60 7.5 3.60 6.6V3.9L5.20 3C5.80 2.3 6.80 1.2 6.80-.6C6.80-4.2 4.3-7 0-7z"
          fill="var(--icon-fill, #1b1712)" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
        />
        <circle cx="-2.6" cy="0.2" r="2" fill="currentColor" />
        <circle cx="2.6" cy="0.2" r="2" fill="currentColor" />
        <path d="M0 2.6l-1 1.8h2z" fill="currentColor" />
        <path d="M-1.1 5.4V7.5M1.1 5.4V7.5" stroke="currentColor" strokeWidth="0.9" />
      </g>
    </svg>
  );
}
