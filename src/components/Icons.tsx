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
