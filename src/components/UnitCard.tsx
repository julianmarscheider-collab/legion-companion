import { HelpTip } from './HelpTip';
import { abilityMultiplier, abilityPoints, basePoints, unitPoints } from '../domain/points';
import type { Ability, Unit } from '../domain/types';

/** Compact stats for lists: grey labels, bright values, spaced apart (no separators). */
export function StatLine({ unit: u }: { unit: Unit }) {
  const stats: [string, string][] = [
    ['Str', `${u.strength}`],
    ['Dmg', `${u.damage}`],
    ['Def', `${u.defense}${u.defenseType !== 'None' ? ` (${u.defenseType})` : ''}`],
    ['Spd', `${u.speed}`],
    ['Tgh', `${u.toughness}`],
  ];
  return (
    <span className="stat-line">
      {stats.map(([label, value]) => (
        <span key={label} className="stat">
          {label} <b>{value}</b>
        </span>
      ))}
    </span>
  );
}

/** Number of physical miniatures owned, shown right after a unit's name. */
export function MiniCount({ count }: { count: number }) {
  return (
    <span className="mini-count" title={`${count} miniature${count === 1 ? '' : 's'} owned`}>
      ×{count}
    </span>
  );
}

/** Read-only unit card, used in the game's enemy reference and the unit editor preview. */
export function UnitCard({ unit, abilities }: { unit: Unit; abilities: Ability[] }) {
  const own = unit.abilityIds.map((id) => abilities.find((a) => a.id === id)).filter((a): a is Ability => !!a);
  return (
    <article className="unit-card">
      {unit.photos[0] && <img className="unit-photo" src={unit.photos[0]} alt={unit.name} />}
      <header className="row between">
        <h3>
          {unit.name} <MiniCount count={unit.count} />
        </h3>
        <span className="points">{unitPoints(unit, abilities)} pts</span>
      </header>
      <dl className="stats">
        <div><dt>Strength</dt><dd>{unit.strength}</dd></div>
        <div><dt>Damage</dt><dd>{unit.damage}</dd></div>
        <div><dt>Defense</dt><dd>{unit.defense}</dd></div>
        <div><dt>Type</dt><dd>{unit.defenseType}</dd></div>
        <div><dt>Speed</dt><dd>{unit.speed}</dd></div>
        <div><dt>Toughness</dt><dd>{unit.toughness}</dd></div>
      </dl>
      {own.length > 0 && (
        <ul className="abilities">
          {own.map((a) => (
            <li key={a.id}>
              <strong>{a.name}</strong> — {a.description}
            </li>
          ))}
        </ul>
      )}
      {unit.description && <p className="muted">{unit.description}</p>}
    </article>
  );
}

export function PointsBreakdown({ unit, abilities }: { unit: Unit; abilities: Ability[] }) {
  return (
    <p className="points-breakdown">
      <strong className="label-text">
        {unitPoints(unit, abilities)} points <HelpTip rule="points" />
      </strong>
      <span className="muted">{' = ' + breakdown(unit, abilities)}</span>
    </p>
  );
}

function breakdown(unit: Unit, abilities: Ability[]): string {
  const add = abilityPoints(unit, abilities);
  const mult = abilityMultiplier(unit, abilities);
  let text = `stats ${basePoints(unit)}`;
  if (add !== 0 || mult === 1) text += ` ${add < 0 ? '−' : '+'} abilities ${Math.abs(add)}`;
  if (mult !== 1) text = `(${text}) × ${Math.round(mult * 100) / 100}`;
  return text;
}
