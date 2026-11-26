# Nouse Daily Wordle

A serverless, deterministic, embeddable daily Wordle game built in **React 19 + TypeScript** for the Nouse Puzzles site (`https://puzzles.nouse.co.uk`), powered by the local `words.json` dictionary (5,757 five-letter words).

---

## Summary of Work & Changes Made

### New Files Created (`src/Wordle/`)

| File                          | Purpose                                                                                                                                                                                                                                                                                                                                                                        |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/Wordle/wordleEngine.ts`  | Core game logic: word list normalization, deterministic UTC/GMT day indexing, Mulberry32 seeded Fisher–Yates non-repeating word schedule with multi-cycle reshuffling, XOR target obfuscation at rest, exact duplicate-letter guess evaluation, QWERTY key priority upgrading, `localStorage` persistence, streak/statistics tracking, and clipboard share summary formatting. |
| `src/Wordle/WordleWidget.tsx` | Self-contained, embed-friendly `<WordleWidget />` React component featuring a 6×5 grid, physical + on-screen QWERTY keyboard input, flip/pop/shake animations, live `00:00 GMT` countdown timer, automatic midnight rollover, **Share** results button, **How to Play** modal, and **Statistics** modal.                                                                       |
| `src/Wordle/WordleWidget.css` | Strictly scoped styles (`.nw-widget` prefix and `--nw-*` custom properties) with host-site button resets and mobile responsiveness down to `~320px–340px` widths without full-page takeover.                                                                                                                                                                                   |
| `src/Wordle/WordleGame.tsx`   | Standalone Nouse Puzzles page wrapper mounted at `/wordle`, matching the Nouse Puzzles branding with top navigation back to Home and Nouse Tech footer.                                                                                                                                                                                                                        |
| `src/Wordle/README.md`        | Documentation of architecture, features, algorithms, storage schema, props, and site integration changes.                                                                                                                                                                                                                                                                      |

_(Removed the empty placeholder file `src/Wordle/Wordle_game`.)_

### Existing Files Updated

| File                        | Changes Made                                                                                                                                                                                                                                                                       |
| :-------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/App.tsx`               | Imported `WordleGame` and registered `<Route path="/wordle" element={<WordleGame />} />` alongside `/` and `/crossword`.                                                                                                                                                           |
| `src/Puzzles Home/Home.tsx` | Replaced the `"under development"` placeholder under the **Wordle** tab (desktop navbar & mobile slide-out drawer) with an intro blurb and `<Link to="/wordle">` card matching Crossword, and updated the Home welcome text to note that both Crossword and daily Wordle are live. |
| `src/App.css`               | Added styling for the standalone `/wordle` page shell (`.wordle-page`, `.wordle-page-topbar`, `.wordle-page-heading`, `.wordle-return-home`, `.wordle-page-main`) in Nouse purple (`rgb(94, 50, 130)`) and editorial serif typography.                                             |

---

## Key Features & Technical Details

### 1. Deterministic Daily GMT Word Rotation (Serverless)

- **Fixed Epoch**: `2026-11-26T00:00:00Z` (`EPOCH_UTC_MS = Date.UTC(2026, 10, 26, 0, 0, 0)`).
- **Timezone Independence**: Computes elapsed full UTC days (`daysSinceEpoch`) using `Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())`, ensuring local timezones and daylight saving shifts never desynchronize puzzles across readers worldwide.
- **Live Countdown & Midnight Rollover**: Displays a live `HH:MM:SS` countdown to the next `00:00:00 GMT` rollover once today's game ends, and automatically resets the board if a player keeps the page open across `00:00 GMT` while keeping historical statistics intact.

### 2. Non-Repeating Seeded Word Schedule

- **Flexible Dictionary Input**: `normalizeWordList()` accepts both `{ "words": ["which", ...] }` (the current `src/Wordle/words.json` format) and flat `["which", ...]` JSON arrays, normalizing to uppercase, filtering to valid 5-letter A–Z words, and deduplicating while preserving order (`5,757` unique words).
- **Seeded Fisher–Yates Shuffle**: Uses a deterministic 32-bit PRNG (`mulberry32`) seeded with `0x4e4f5553` (`"NOUS"`) so every reader gets the exact same non-alphabetical sequence and **no word repeats** until all 5,757 words (~15.7 years of daily puzzles) have appeared once.
- **Explicit Cycle Rollover**:
  - **Cycle 1** (`daysSinceEpoch < words.length`): Indexes directly into `shuffledWords[daysSinceEpoch]`.
  - **Cycle 2+** (`daysSinceEpoch >= words.length`): Derives a new deterministic seed per cycle (`deriveCycleSeed`), reshuffles the dictionary, prevents the first word of Cycle `N + 1` from matching the final word of Cycle `N` (zero back-to-back boundary repeats), and displays a **Cycle Complete** status banner in the UI.

### 3. State Persistence & Anti-Cheat

- **Board State (`nouse_wordle_board_v1`)**: Stores `{ daysSinceEpoch, guesses, status }` in `localStorage`. On refresh during the same UTC day, guesses are re-validated against `words.json` and re-scored deterministically against today's word so players cannot replay or tamper with their status.
- **Statistics (`nouse_wordle_stats_v1`)**: Tracks `gamesPlayed`, `gamesWon`, `currentStreak`, `maxStreak`, 1–6 `guessDistribution`, and `lastCompletedDay` (which prevents double-counting refreshes and verifies consecutive-day win streaks).
- **Target Word Protection**: Today's answer is never written to `localStorage`, React state, or DOM attributes prior to completion; in memory it is stored as XOR-masked character codes inside a closure and decoded transiently only during guess evaluation or loss reveal.

### 4. Exact Duplicate-Letter Scoring & Keyboard Upgrading

- **Two-Pass Evaluation (`evaluateGuess`)**:
  1. **Pass 1 (Green / `correct`)**: Marks exact position matches first and decrements available letter counts in the target word.
  2. **Pass 2 (Yellow / `present` vs. Gray / `absent`)**: Scans remaining letters left-to-right, awarding yellow only up to remaining unmatched occurrences of that letter in the target word, and gray otherwise.
- **Keyboard Priority (`computeKeyboardStates`)**: Upgrades on-screen keys strictly monotonically (`unused` -> `absent` -> `present` -> `correct`) so a green key never downgrades to yellow or gray on subsequent guesses.

### 5. Embed-Friendly News-Site UX

- **Scoped Styling**: All widget selectors live under `.nw-widget` in `WordleWidget.css` with explicit button resets so host site stylesheets (`index.css`, `App.css`, or article CSS) cannot distort tiles or keyboard keys.
- **Safe Keyboard Listener**: Physical keyboard input (`A–Z`, `Backspace`, `Enter`, `Escape`) ignores modifier shortcuts (`Ctrl`/`Cmd`/`Alt`) and ignores focus inside external `<input>`, `<textarea>`, or `contentEditable` elements so search bars and comment boxes on a host article page work normally.
- **Mobile Responsive**: Fluid grid tiles and flex QWERTY keys scale cleanly down to `320px–340px` viewports with `touch-action: manipulation`.
- **Share Summary**: Copies an emoji grid (`Daily Word #<N> <score>/6` + `🟩`/`🟨`/`⬛` rows + puzzle URL) to the clipboard via `navigator.clipboard.writeText` with a fallback for older browsers.
- **End-of-Game Word Definition & Caching**: Once today's game finishes (win or loss), fetches `https://api.dictionaryapi.dev/api/v2/entries/en/<word>` to display the target word, phonetic spelling (if available), part of speech, and primary definition inside both the end-of-game modal and inline completion summary card. Shows a subtle `"Loading definition..."` indicator in flight, caches lookups in `localStorage` under `def_<WORD>` (e.g., `def_CRANE`) to prevent repeat API requests on modal reopen or refresh, and fails silently (hiding the definition block completely) on timeouts, network errors, or `404` responses.

---

## Embedding `<WordleWidget />` Anywhere

`<WordleWidget />` can be used standalone on `/wordle` or dropped directly into any article or section:

```tsx
import WordleWidget from "./Wordle/WordleWidget";

export function ArticleEmbed() {
  return (
    <WordleWidget
      title="Daily Wordle"
      shareUrl="https://puzzles.nouse.co.uk/wordle"
    />
  );
}
```

### Optional Props (`WordleWidgetProps`)

| Prop        | Type                              | Default                | Description                                                         |
| :---------- | :-------------------------------- | :--------------------- | :------------------------------------------------------------------ |
| `wordsData` | `string[] \| { words: string[] }` | Local `./words.json`   | Custom word list array or `{ words }` object.                       |
| `wordsUrl`  | `string`                          | `undefined`            | Optional URL to fetch an external `words.json` file at runtime.     |
| `shareUrl`  | `string`                          | `window.location.href` | Link appended at the bottom of the copied emoji share text.         |
| `title`     | `string`                          | `"Daily Wordle"`       | Heading displayed in the widget header (`<title> #<puzzleNumber>`). |

---

## Running & Building

```bash
# Start local Vite dev server
npm run dev

# Type-check and build production bundle
npm run build

# Lint and check formatting
npm run lint
npm run format-check
```
