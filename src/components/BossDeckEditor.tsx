import type { Ability, BossDeckEntry } from '../domain/types';
import { CardPreview } from './CardPreview';
import { Dropdown } from './Dropdown';
import { LabelText } from './HelpTip';
import { MinusIcon, PlusIcon } from './Icons';

/** Boss deck: boss cards with a number of copies each; add single cards or a whole collection. */
export function BossDeckEditor({ deck, cards, onChange }: { deck: BossDeckEntry[]; cards: Ability[]; onChange(deck: BossDeckEntry[]): void }) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const entries = deck.filter((e) => byId.has(e.abilityId));
  const total = entries.reduce((n, e) => n + Math.max(1, e.copies), 0);
  const free = cards.filter((c) => !deck.some((e) => e.abilityId === c.id));
  const collections = [...new Set(cards.map((c) => (c.collection ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const setCopies = (id: string, copies: number) =>
    onChange(copies <= 0 ? deck.filter((e) => e.abilityId !== id) : deck.map((e) => (e.abilityId === id ? { ...e, copies } : e)));

  return (
    <fieldset className="boss-deck">
      <legend>
        <LabelText label={`Boss deck (${total} ${total === 1 ? 'card' : 'cards'})`} help="bossDeck" />
      </legend>
      {entries.length === 0 && <p className="muted small">No boss cards yet.</p>}
      <ul className="picked">
        {entries.map((e) => {
          const c = byId.get(e.abilityId)!;
          return (
            <li key={e.abilityId}>
              <span className="grow">
                <CardPreview title={c.name} text={c.description}>
                  {c.name}
                </CardPreview>
                {c.collection && <span className="muted"> · {c.collection}</span>}
              </span>
              <button className="round-btn" aria-label={`One copy less of ${c.name}`} onClick={() => setCopies(e.abilityId, e.copies - 1)}>
                <MinusIcon />
              </button>
              <span className="copies" aria-label="copies">×{e.copies}</span>
              <button className="round-btn" aria-label={`One copy more of ${c.name}`} onClick={() => setCopies(e.abilityId, e.copies + 1)}>
                <PlusIcon />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="grid2">
        <Dropdown
          action
          className="add-enemy"
          value=""
          placeholder="+ Add boss card…"
          ariaLabel="Add boss card"
          options={free.map((c) => ({ value: c.id, label: c.name, group: c.collection?.trim() || 'No collection' }))}
          onChange={(id) => onChange([...deck, { abilityId: id, copies: 1 }])}
        />
        {collections.length > 0 && (
          <Dropdown
            action
            className="add-enemy"
            value=""
            placeholder="+ Add a whole collection…"
            ariaLabel="Add all boss cards of a collection"
            options={collections.map((col) => ({ value: col, label: `${col} (${cards.filter((c) => c.collection?.trim() === col).length} cards)` }))}
            onChange={(col) =>
              onChange([
                ...deck,
                ...cards.filter((c) => c.collection?.trim() === col && !deck.some((e) => e.abilityId === c.id)).map((c) => ({ abilityId: c.id, copies: 1 })),
              ])
            }
          />
        )}
      </div>
      {cards.length === 0 && <small className="muted">Create boss cards under Abilities (tick “Boss deck card”).</small>}
    </fieldset>
  );
}
