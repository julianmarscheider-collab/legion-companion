import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { restoreSampleData } from '../data/seed';

export interface NavItem {
  to: string;
  label: string;
  text: string;
}

/** Generators, grouped: everything about enemies, and everything about missions and maps. */
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Enemies',
    items: [
      { to: '/units', label: 'Units', text: 'Create enemy unit cards for your miniatures' },
      { to: '/abilities', label: 'Abilities', text: 'Special abilities and their point costs' },
      { to: '/enemy-lists', label: 'Enemy lists', text: 'Which enemies can spawn in a game' },
    ],
  },
  {
    title: 'Missions & maps',
    items: [
      { to: '/objectives', label: 'Objectives', text: 'Goals placed on map tiles' },
      { to: '/missions', label: 'Missions', text: 'Combine objectives into missions' },
      { to: '/tiles', label: 'Map tiles', text: 'Your physical tiles and their markers' },
      { to: '/map-sets', label: 'Map sets', text: 'Tile decks for a game' },
    ],
  },
];

export function HomePage() {
  const { user } = useAuth();
  const [restoreMsg, setRestoreMsg] = useState('');
  const restore = async () => {
    const ok = confirm(
      'Restore the example content (Goblins, Goblin Caves, The Goblin Warren)?\n\n' +
        'Example items are reset to their original version: changes you made to them are overwritten, and deleted examples come back. ' +
        'Your own units, tiles, objectives, missions and games are not touched.',
    );
    if (!ok) return;
    const r = await restoreSampleData(user!.id);
    setRestoreMsg(`Example content restored: ${r.updated} reset, ${r.added} added.`);
  };
  return (
    <div className="page">
      <Link to="/play" className="hero-play card">
        <h1>▶ Play</h1>
        <p>Start a new game or continue a saved one.</p>
      </Link>
      {NAV_GROUPS.map((g) => (
        <section key={g.title} className="nav-group">
          <h2>{g.title}</h2>
          <div className="tiles-grid">
            {g.items.map((i) => (
              <Link key={i.to} to={i.to} className="card nav-card">
                <strong>{i.label}</strong>
                <small className="muted">{i.text}</small>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <Link to="/rules" className="card nav-card rules-card">
        <strong>Rules</strong>
        <small className="muted">Everything behind the “?” icons, in one place</small>
      </Link>
      <p className="footer-links">
        <Link to="/licenses">Licenses</Link> ·{' '}
        <button className="link-button" onClick={restore}>
          Restore example content
        </button>
      </p>
      {restoreMsg && <p className="center muted" role="status">{restoreMsg}</p>}
    </div>
  );
}
