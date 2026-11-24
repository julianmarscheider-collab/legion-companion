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
