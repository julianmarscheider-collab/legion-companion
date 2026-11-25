import { createHashRouter, NavLink, Outlet, RouterProvider } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { HomePage, NAV_GROUPS } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { RulesPage } from './pages/RulesPage';
import { LicensesPage } from './pages/LicensesPage';
import { UnitsPage } from './pages/generators/UnitsPage';
import { AbilitiesPage, EnemyListsPage, MapSetsPage, MapTilesPage, MissionsPage, ObjectivesPage } from './pages/generators/SimplePages';
import { GamePage } from './pages/play/GamePage';
import { PlaySetup } from './pages/play/PlaySetup';

function Layout() {
  const { user, loading, signOut } = useAuth();
  if (loading) return null;
  if (!user) return <LoginPage />;
  return (
    <>
      <header className="topbar">
        <NavLink to="/" className="brand">
          <img src="./icon.svg" alt="" /> <span className="brand-name">Legion<span className="brand-long"> Companion</span></span>
        </NavLink>
        <nav>
          <NavLink to="/play" className="nav-play">
            ▶ Play
          </NavLink>
          {NAV_GROUPS.map((g) => (
            <div key={g.title} className="nav-box wide-only" role="group" aria-label={g.title}>
              {g.items.map((i) => (
                <NavLink key={i.to} to={i.to}>
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
          <NavLink to="/rules">Rules</NavLink>
        </nav>
        <button className="ghost small" onClick={signOut} title={`Signed in as ${user.username}`}>
          Sign out
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}

// Hash routing works the same on a static web host and inside the Android app.
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/units', element: <UnitsPage /> },
      { path: '/abilities', element: <AbilitiesPage /> },
      { path: '/enemy-lists', element: <EnemyListsPage /> },
      { path: '/objectives', element: <ObjectivesPage /> },
      { path: '/missions', element: <MissionsPage /> },
      { path: '/tiles', element: <MapTilesPage /> },
      { path: '/map-sets', element: <MapSetsPage /> },
      { path: '/play', element: <PlaySetup /> },
      { path: '/rules', element: <RulesPage /> },
      { path: '/licenses', element: <LicensesPage /> },
      { path: '/game/:id', element: <GamePage /> },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
