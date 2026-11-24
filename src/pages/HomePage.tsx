import { Link } from 'react-router-dom';

export const GENERATORS = [
  { to: '/units', label: 'Units', text: 'Create enemy unit cards for your miniatures' },
  { to: '/abilities', label: 'Abilities', text: 'Special abilities and their point costs' },
  { to: '/enemy-lists', label: 'Enemy lists', text: 'Which enemies can spawn in a game' },
  { to: '/objectives', label: 'Objectives', text: 'Goals placed on map tile markers' },
  { to: '/missions', label: 'Missions', text: 'Combine objectives into missions' },
  { to: '/tiles', label: 'Map tiles', text: 'Your physical tiles and their markers' },
  { to: '/map-sets', label: 'Map sets', text: 'Tile decks for a game' },
];

export function HomePage() {
  return (
    <div className="page">
      <Link to="/play" className="hero-play card">
        <h1>▶ Play</h1>
        <p>Start a new game or continue a saved one.</p>
      </Link>
      <h2>Generators</h2>
      <div className="tiles-grid">
        {GENERATORS.map((g) => (
          <Link key={g.to} to={g.to} className="card nav-card">
            <strong>{g.label}</strong>
            <small className="muted">{g.text}</small>
          </Link>
        ))}
      </div>
      <p className="footer-links">
        <Link to="/rules">Rules</Link> · <Link to="/licenses">Licenses</Link>
      </p>
    </div>
  );
}
