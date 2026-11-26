# Legion Companion

A PvE game-master app for tabletop games played with your own miniature collection.
You build enemy unit cards, missions and map tiles; during play the app runs the
activation deck, enemy spawning and map exploration and tells you what to do on the
physical board.

It runs in any modern browser (installable as an app on a laptop) and is set up
to be wrapped as an Android app with Capacitor.

## Live version

Every push to `main` is built and published by GitHub Actions (`.github/workflows/deploy.yml`):
**https://julianmarscheider-collab.github.io/legion-companion/**

One-time setup: repository **Settings → Pages → Source: GitHub Actions**.

## Run it

```bash
npm install
npm run dev        # development server at http://localhost:5173
npm test           # game engine and points tests
npm run build      # production build in dist/
npm run preview    # serve the production build (installable as a PWA)
```

Create an account on first start. New accounts get a small example set
(goblins, caves, one mission) to try the game flow.

## Project layout

| Path | What it is |
| --- | --- |
| `src/domain/types.ts` | Data model: units, abilities, enemy lists, objectives, missions, map tiles, map sets |
| `src/domain/rules.ts` | Rules texts behind the “?” icons and the Rules page, incl. rules placeholders |
| `src/domain/points.ts` | Automatic unit point values (tune the constants at the top) |
| `src/game/engine.ts` | Pure game logic: activation deck, spawning, tile deck, objectives. Tuning constants at the top |
| `src/game/rng.ts` | Seeded random generator, stored in the save so undo/load are exact |
| `src/data/repositories.ts` | **Storage interface** – the only code that talks to the database |
| `src/data/db.ts` | Local IndexedDB database (Dexie) |
| `src/auth/auth.ts` | **Account interface** + local accounts (PBKDF2-hashed passwords) |
| `scripts/collect-licenses.mjs` | Gathers license texts of all shipped libraries and fonts into `public/licenses.txt` (runs automatically on build), shown on the in-app Licenses page |
| `src/platform/camera.ts` | Camera: browser webcam/upload now, native camera on Android |
| `src/pages/` | Screens: generators, play setup, game |

## Game rules as implemented

- **Rolls** are d6 "X+" rolls. Strength = hero's defense target, Defense = hero's attack target.
- **Points**: stats = 10 × (expected damage dealt + expected damage to take out) × (1 + (speed − 2)/4), with
  dice chance (x − 1)/6: dealt = (1 + 1.5 × (attacks − 1)) × (1 + 0.75 × (damage − 1)) × chance(strength), take out = toughness × wounds × chance(defense)
  (× 0.75 with a defense type). Unit points = (stats + additive abilities) × multiplicative abilities.
- **Activation deck** (per round): one generic hero card per hero (any hero with a ready
  activation token may act), enemy cards = heroes × difficulty factor (placeholder values
  0.75 / 1 / 1.25 / 1.5, rounded, minimum 1; see `enemyCardCount`), and 1 spawn card
  (2 on Hard/Nightmare). When it runs out, a new round starts and it's reshuffled.
  Enemy cards are never drawn back to back, and an enemy card drawn while no enemies are
  on the board becomes a spawn card.
- **Enemy activation** picks a third of the tiles in play at random (rounded up); **spawn** picks a quarter (rounded up).
- **Spawning** budget = 10 points × heroes × difficulty (0.75 / 1 / 1.3 / 1.6). A unit is picked
  weighted by spawn priority, only if enough miniatures are free for its minimum
  spawn number. "Grouped with" units are added if budget remains. Never more than you own.
- **Objectives** are hidden on a random map tile with a matching marker type and revealed
  when that tile is explored.
- Use **− / +** in the in-game enemy list when miniatures die, so they become available again.
- The game is saved after every action; **Undo** steps back one action.

## Fonts

Cinzel (headings) and EB Garamond (text), bundled from Fontsource, SIL Open Font License 1.1:
free to use in paid apps as long as the license notices ship with the app (the Licenses page does that).

## Moving to an online database later

1. Implement `Repository<T>` (in `src/data/repositories.ts`) for your backend,
   e.g. Supabase, Firebase or your own REST API, and swap the `repos` exports.
2. Implement `AuthService` (in `src/auth/auth.ts`) with the backend's auth and swap the `auth` export.
3. Photos are stored inline as compressed JPEG data URLs; for an online backend, move them to
   file storage and keep URLs in `photos` instead.

No screens need to change.

## Building the Android app

Requires Android Studio on your machine.

```bash
npm run build
npx cap add android      # once: creates the android/ project
npx cap sync android     # after every web build
npx cap open android     # opens Android Studio: run on a device or build an APK/AAB
```

Before publishing, change `appId` in `capacitor.config.ts` to your own
(e.g. `com.yourname.legioncompanion`). For the camera, add to
`android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```
