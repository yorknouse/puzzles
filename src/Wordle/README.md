# Nouse Daily Wordle

**Nouse Daily Wordle** is a clean, serverless, embeddable daily five-letter word puzzle built in **React 19 + TypeScript** for the Nouse Puzzles site (`https://puzzles.nouse.co.uk`). Powered directly by a local `words.json` dictionary, it delivers the exact same daily word to every reader worldwide at midnight GMT without requiring a backend server.

---

## Features

- **Global `00:00 GMT` Daily Puzzle**: Every player worldwide receives the exact same daily puzzle at `00:00:00 GMT` regardless of their local timezone, complete with a live `HH:MM:SS` countdown timer to the next puzzle.
- **Non-Repeating Word Schedule**: Deterministically shuffles the entire `words.json` dictionary so no word repeats until every single word in the list has been played once, automatically reshuffling into a new cycle once completed.
- **Classic 6×5 Gameplay & Dual Input**: Supports both physical keyboards (`A–Z`, `Backspace`, `Enter`, `Escape`) and an accessible on-screen QWERTY keyboard with 3D tile-flip reveals, active-letter pop animations, and row-shake validation feedback.
- **Accurate Duplicate-Letter Coloring**: Scores exact green matches first, awards yellow tiles only up to remaining unmatched occurrences of a letter in the target word, and upgrades keyboard keys monotonically without downgrading.
- **End-of-Game Word Meaning**: Automatically fetches and displays today's target word, phonetic pronunciation, part of speech, and concise definition via the Free Dictionary API upon finishing a game (win or loss), cached locally with silent fallback on missing entries or offline connections.
- **Shareable Emoji Grid**: One-click **Share** button copies a spoiler-free emoji summary (`Daily Word #<N> <score>/6` + `🟩`/`🟨`/`⬛` grid + puzzle link) straight to the clipboard.
- **Persistent Progress & Player Statistics**: Saves current-day progress, games played, win percentage, current/max streaks, and 1–6 guess distribution in `localStorage` while automatically resetting when a new GMT day begins or when `words.json` is updated.
- **Embed-Friendly & Mobile Responsive**: Scoped `.nw-widget` styling fits seamlessly inside standalone puzzle pages or news articles down to `~320px–340px` mobile screens without clashing with host-site CSS.

---

## Technical Details

### 1. Deterministic GMT Word Rotation

- **Fixed UTC Epoch**: Anchored at `2026-11-26T00:00:00Z` (`EPOCH_UTC_MS = Date.UTC(2026, 10, 26, 0, 0, 0)`).
- **Timezone-Proof Calculation**: `getUtcDaysSinceEpoch()` uses `Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())` so local timezone offsets and daylight saving transitions never shift puzzle boundaries.
- **Live Rollover**: A 1-second interval updates the `00:00 GMT` countdown and detects midnight rollovers in real time, resetting the board automatically while keeping player statistics intact.

### 2. Seeded Non-Repeating Shuffle & Dual-Pool Dictionary

- **Curated Answers + Full Guess Pool (`words.json`)**: `parseDictionarySource()` splits `words.json` into **2,252 common everyday English target words** (`words`, used for daily answers so puzzles are always fair, recognizable, and well-covered by the dictionary API) and **6,827 extra valid guesses** (`allowedGuesses`), allowing all **9,079** 5-letter words to be submitted as guesses. Flat `["...", ...]` arrays are also supported automatically.
- **Mulberry32 + Fisher–Yates**: `seededShuffle()` pairs a deterministic 32-bit Mulberry32 PRNG (`BASE_SHUFFLE_SEED = 0x1185`) with Fisher–Yates shuffling so every target word appears once per cycle (~6.2 years) in a non-alphabetical order.
- **Multi-Cycle Continuity**: For `daysSinceEpoch >= words.length`, `deriveCycleSeed()` generates a fresh deterministic seed per cycle, swaps any boundary collision so the last word of Cycle `N` never repeats as the first word of Cycle `N + 1`, and displays a **Cycle Complete** status banner.

### 3. State Persistence, Dictionary-Change Reset & Anti-Cheat

- **Board Storage (`nouse_wordle_board_v2`)**: Persists `{ daysSinceEpoch, puzzleSignature, guesses, status }` in `localStorage`. Refreshing on the same GMT day restores and re-validates all submitted guesses so players cannot replay a finished daily puzzle.
- **Automatic `words.json` Signature Invalidation**: Computes a fast 32-bit FNV-1a hex fingerprint (`puzzleSignature`) combining the UTC day, word-list hash, and target word, and keys `<WordleBoardSession key={puzzle.puzzleSignature} />`. Swapping or editing `words.json` immediately invalidates stale board state without exposing the answer in plain text.
- **Target Obfuscation at Rest**: Today's word is never stored in plain text in `localStorage`, React state, or DOM attributes prior to game end; in memory it is held as XOR-masked character codes inside a closure and decoded transiently during evaluation or loss reveal.

### 4. Two-Pass Duplicate-Letter Scoring & Keyboard Priority

- **`evaluateGuess(guess, target)`**:
  1. **Pass 1 (`correct` / Green)**: Identifies exact positional matches first and decrements remaining available letter counts from the target word.
  2. **Pass 2 (`present` / Yellow vs. `absent` / Gray)**: Scans remaining positions left-to-right, marking yellow only while unmatched target occurrences remain.
- **`computeKeyboardStates()`**: Enforces strict priority (`unused < absent < present < correct`) so green keys never downgrade on subsequent guesses.

### 5. End-of-Game Dictionary API Lookup & Caching

- **Endpoint**: Fetches `https://api.dictionaryapi.dev/api/v2/entries/en/${targetWord.toLowerCase()}` only after `status` transitions to `"won"` or `"lost"`.
- **Response Parsing**: Extracts `word`, `phonetic` (falling back to the first non-empty `phonetics[].text`), `meanings[0].partOfSpeech`, and `meanings[0].definitions[0].definition`.
- **Caching & Silent Fallback**: Caches definitions in `localStorage` under `def_<WORD>` (e.g., `def_CRANE`) so modal reopens and page refreshes make zero duplicate network calls. Uses a `6.5s` `AbortController` timeout and hides the definition UI silently on network errors, timeouts, or `404` responses.

### 6. Embedding `<WordleWidget />` & Commands

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

| Prop        | Type                              | Default                | Description                                                     |
| :---------- | :-------------------------------- | :--------------------- | :-------------------------------------------------------------- |
| `wordsData` | `string[] \| { words: string[] }` | Local `./words.json`   | Custom word list array or `{ words }` object.                   |
| `wordsUrl`  | `string`                          | `undefined`            | Optional URL to fetch an external `words.json` file at runtime. |
| `shareUrl`  | `string`                          | `window.location.href` | Link appended to the copied emoji share summary.                |
| `title`     | `string`                          | `"Daily Wordle"`       | Heading shown in the widget header (`<title> #<puzzleNumber>`). |

```bash
npm run dev          # Start local Vite dev server
npm run build        # Run TypeScript check and build production bundle
npm run lint         # Run ESLint checks
npm run format-check # Check Prettier formatting
```

---

_Yours truly, Utkarsh Singh_

---

## All Changes Made & Development Process

### Development Process

1. **Codebase & Architecture Audit**: Inspected the existing Nouse Puzzles React + TypeScript + Vite architecture, router setup (`App.tsx`), home navigation (`Home.tsx`), Crossword game implementation, and `words.json` dictionary structure.
2. **Core Engine Implementation (`wordleEngine.ts`)**: Built deterministic UTC/GMT epoch day calculation, Mulberry32 Fisher–Yates non-repeating word scheduling with Cycle 2+ boundary-safe reshuffling, XOR target-word obfuscation, two-pass duplicate-letter evaluation, keyboard priority computation, `localStorage` board/stats persistence, and emoji share text generation.
3. **Scoped Widget & Standalone Page (`WordleWidget.tsx`, `WordleWidget.css`, `WordleGame.tsx`)**: Created the responsive `.nw-widget` component (supporting physical and on-screen QWERTY input, **How to Play** and **Statistics** modals, and `320px–340px` mobile viewports) alongside the Nouse-branded `/wordle` page shell.
4. **Site Navigation Integration (`App.tsx`, `Home.tsx`, `App.css`)**: Wired `/wordle` into React Router and connected the **Wordle** tab in both the desktop navbar and mobile drawer on the Nouse Puzzles home page.
5. **Free Dictionary API Integration**: Extended the end-of-game summary card and modal to fetch, display, and cache (`def_<WORD>`) word definitions, phonetics, and parts of speech from `dictionaryapi.dev` with a subtle loading indicator and silent error/404 handling.
6. **Dictionary-Change Auto-Reset (`puzzleSignature`)**: Added FNV-1a word-list and puzzle fingerprinting (`nouse_wordle_board_v2` + React session keying) so replacing or editing `words.json` immediately resets any stale saved board state while preserving same-day anti-cheat persistence.
7. **Verification**: Validated TypeScript (`tsc -b`), ESLint, Prettier, Vite production bundling (`vite build`), and automated assertions covering duplicate-letter scoring, full-cycle non-repetition, dictionary caching, and persistence.

### Files Created & Modified

| File                          | Status  | Summary of Changes                                                                                                                                                                 |
| :---------------------------- | :------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/Wordle/wordleEngine.ts`  | Created | Deterministic GMT schedule, seeded shuffle, `puzzleSignature` board persistence, stats tracking, duplicate-letter scoring, share formatter, and cached Free Dictionary API client. |
| `src/Wordle/WordleWidget.tsx` | Created | Embeddable Wordle game widget, keyboard handlers, animations, countdown timer, definition display, and **How to Play** / **Statistics** modals.                                    |
| `src/Wordle/WordleWidget.css` | Created | Scoped `.nw-widget` styles, Nouse purple theme variables, host-site button resets, definition card styling, and mobile breakpoints.                                                |
| `src/Wordle/WordleGame.tsx`   | Created | Standalone `/wordle` page wrapper with Nouse Puzzles top bar, Home link, and Nouse Tech footer.                                                                                    |
| `src/Wordle/README.md`        | Created | Project overview, features, technical documentation, author sign-off, development process, and changelog.                                                                          |
| `src/Wordle/words.json`       | Updated | Structured into 2,252 curated common English daily target `words` + 6,827 `allowedGuesses` (9,079 total valid 5-letter guesses).                                                   |
| `src/App.tsx`                 | Updated | Added the `/wordle` route pointing to `WordleGame`.                                                                                                                                |
| `src/Puzzles Home/Home.tsx`   | Updated | Linked the **Wordle** navigation option on the home page to `/wordle` and updated the home introduction text.                                                                      |
| `src/App.css`                 | Updated | Added `.wordle-page` header, layout, and responsive return-home link styles.                                                                                                       |
| `src/Wordle/Wordle_game`      | Removed | Deleted empty placeholder file.                                                                                                                                                    |
