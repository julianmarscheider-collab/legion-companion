import { useState, type ReactNode } from 'react';
import { EnemySkullIcon, TileFanIcon, TileIcon } from '../components/Icons';
import { Link, useNavigate } from 'react-router-dom';
import { repos } from '../data/repositories';
import { useCollection } from '../data/useCollection';
import { useAuth } from '../auth/AuthContext';
import { restoreSampleData } from '../data/seed';

export interface NavItem {
  to: string;
  label: string;
  text: string;
  /** Small symbol on the home page card. */
  icon: ReactNode;
}

/** Text presentation, so phones don't swap the symbols for colour emoji. */
const T = '\uFE0E';

/**
 * Generators, grouped: everything about enemies (gold), and everything about missions and maps (blue).
 * The tone is shared by the home page cards and the tabs at the top.
 */
export const NAV_GROUPS: { title: string; tone: 'gold' | 'blue'; items: NavItem[] }[] = [
  {
    title: 'Enemy forces',
    tone: 'gold',
    items: [
      { to: '/enemies', label: 'Enemies', icon: <EnemySkullIcon />, text: 'Create enemy unit cards for your miniatures' },
      { to: '/abilities', label: 'Abilities', icon: '✧' + T, text: 'Give your units special abilities' },
      { to: '/enemy-lists', label: 'Enemy lists', icon: '☰' + T, text: 'Combine your miniatures into lists to use in play' },
    ],
  },
  {
    title: 'Missions & maps',
    tone: 'blue',
    items: [
      { to: '/objectives', label: 'Objectives', icon: '⚑' + T, text: 'Create objectives for your heroes to fulfill' },
      { to: '/missions', label: 'Missions', icon: '✠' + T, text: 'Combine objectives into missions' },
      { to: '/tiles', label: 'Map tiles', icon: <TileIcon />, text: 'Add the tiles that make up the game board' },
      { to: '/map-sets', label: 'Map sets', icon: <TileFanIcon />, text: 'Combine your tiles into sets to use in play' },
    ],
  },
];

/** How many saved games the home page offers to continue; the rest are on the Play page. */
const RECENT_GAMES = 3;

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const games = useCollection(repos.games);
  const recent = [...games].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, RECENT_GAMES);
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
    <div className="page home">
      <div className="home-top">
        <Link to="/play" className="home-card home-play">
          <div className="home-card-inner">
            <img src="./icon.svg" alt="" />
            <h1>Play</h1>
            <p>Start a new game or continue a saved one</p>
          </div>
        </Link>
        {recent.length > 0 && (
          <section className="home-continue" aria-label="Continue a saved game">
            <h2>Continue</h2>
            {recent.map((g) => (
              <button key={g.id} className="home-game" onClick={() => navigate(`/game/${g.id}`)}>
                <span className="grow left">
                  <strong>{g.name}</strong>
                  <small className="muted">
                    {g.config.heroCount} {g.config.heroCount === 1 ? 'hero' : 'heroes'} · round {g.snapshot.round} · {new Date(g.updatedAt).toLocaleDateString()}
                  </small>
                </span>
                <span className="home-game-go">Continue ›</span>
              </button>
            ))}
            {games.length > RECENT_GAMES && (
              <Link to="/play" className="home-more">
                All {games.length} saved games ›
              </Link>
            )}
          </section>
        )}
      </div>
      <div className="home-groups">
        {NAV_GROUPS.map((g) => (
          <section key={g.title} className={`home-group tone-${g.tone}`}>
            <h2>{g.title}</h2>
            <div className="home-row">
              {g.items.map((i) => (
                <Link key={i.to} to={i.to} className="home-card">
                  <div className="home-card-inner">
                    <h3>{i.label}</h3>
                    <span className="home-icon" aria-hidden="true">{i.icon}</span>
                    <p>{i.text}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="footer-links">
        <Link to="/rules">Rules reference</Link> · <Link to="/licenses">Licenses</Link> ·{' '}
        <button className="link-button" onClick={restore}>
          Restore example content
        </button>
      </p>
      {restoreMsg && <p className="center muted" role="status">{restoreMsg}</p>}
    </div>
  );
}
