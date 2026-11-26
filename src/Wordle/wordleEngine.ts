export type LetterState = "correct" | "present" | "absent" | "empty";
export type KeyState = "correct" | "present" | "absent" | "unused";
export type GameStatus = "playing" | "won" | "lost";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

/** Fixed UTC epoch: 2026-11-26T00:00:00Z */
export const EPOCH_ISO = "2026-11-26T00:00:00Z";
export const EPOCH_UTC_MS = Date.UTC(2026, 10, 26, 0, 0, 0);
const MS_PER_UTC_DAY = 86_400_000;

/** Fixed deterministic base seed ("NOUS" in ASCII hex) */
const BASE_SHUFFLE_SEED = 0x4e4f5553;
const OBFUSCATION_KEY = 0x5a;

const BOARD_STORAGE_KEY = "nouse_wordle_board_v1";
const STATS_STORAGE_KEY = "nouse_wordle_stats_v1";
const DEFINITION_CACHE_PREFIX = "def_";
const DICTIONARY_API_BASE = "https://api.dictionaryapi.dev/api/v2/entries/en/";

export interface DailyPuzzleInfo {
  /** Non-negative full UTC days elapsed since 2026-11-26T00:00:00Z */
  daysSinceEpoch: number;
  /** 1-based human-readable puzzle number (Daily Word #1 on epoch day) */
  puzzleNumber: number;
  /** 1-based cycle number through the full word list (1 = first pass) */
  cycleNumber: number;
  /** 0-based position within the current shuffled cycle */
  indexInCycle: number;
  /** Total unique 5-letter words in the schedule */
  totalWords: number;
  /** True when the schedule has completed at least one full pass */
  hasCompletedFirstCycle: boolean;
  /** Retrieve today's uppercase target word on demand (kept encoded at rest) */
  getTargetWord: () => string;
}

export interface StoredBoardState {
  daysSinceEpoch: number;
  guesses: string[];
  status: GameStatus;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: [number, number, number, number, number, number];
  lastCompletedDay: number | null;
}

export type RawWordsSource = string[] | { words: string[] };

/**
 * Normalizes a `words.json` payload (supports both `["apple", ...]` and `{ "words": ["apple", ...] }`)
 * into a deduplicated uppercase array of valid 5-letter A–Z words while preserving input order.
 */
export function normalizeWordList(raw: RawWordsSource): string[] {
  const list = Array.isArray(raw) ? raw : raw?.words;
  if (!Array.isArray(list)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const entry of list) {
    if (typeof entry !== "string") continue;
    const cleaned = entry.trim().toUpperCase();
    if (/^[A-Z]{5}$/.test(cleaned) && !seen.has(cleaned)) {
      seen.add(cleaned);
      normalized.push(cleaned);
    }
  }

  return normalized;
}

/**
 * Deterministic 32-bit PRNG (Mulberry32).
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let z = Math.imul(state ^ (state >>> 15), 1 | state);
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveCycleSeed(cycleIndex: number): number {
  // Cycle 0 uses BASE_SHUFFLE_SEED; subsequent cycles mix golden-ratio hash constants
  return (BASE_SHUFFLE_SEED ^ Math.imul(cycleIndex, 0x9e3779b9)) >>> 0;
}

/**
 * Seeded Fisher–Yates shuffle so every word in `words` appears once per cycle
 * in a deterministic, non-alphabetical sequence identical for all readers.
 */
export function seededShuffle(
  words: readonly string[],
  seed: number,
): string[] {
  const shuffled = [...words];
  const random = mulberry32(seed);

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = tmp;
  }

  return shuffled;
}

function encodeWord(word: string): number[] {
  return Array.from(word).map(
    (ch, idx) => ch.charCodeAt(0) ^ (OBFUSCATION_KEY + idx * 7),
  );
}

function decodeWord(codes: readonly number[]): string {
  return String.fromCharCode(
    ...codes.map((code, idx) => code ^ (OBFUSCATION_KEY + idx * 7)),
  );
}

/**
 * Computes full UTC/GMT days elapsed since `2026-11-26T00:00:00Z`.
 * Uses UTC calendar components so local timezones and DST shifts never affect puzzle rotation.
 */
export function getUtcDaysSinceEpoch(now: Date = new Date()): number {
  const todayUtcMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0,
    0,
    0,
  );
  const elapsed = Math.floor(
    (todayUtcMidnight - EPOCH_UTC_MS) / MS_PER_UTC_DAY,
  );
  return Math.max(0, elapsed);
}

/**
 * Milliseconds remaining until the next `00:00:00 GMT` rollover.
 */
export function getMsUntilNextUtcMidnight(now: Date = new Date()): number {
  const nextMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
  );
  return Math.max(0, nextMidnight - now.getTime());
}

export function formatCountdownHms(msRemaining: number): string {
  const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((unit) => String(unit).padStart(2, "0"))
    .join(":");
}

const cycleCache = new Map<string, string[]>();

function getShuffledCycleWords(
  words: readonly string[],
  cycleIndex: number,
): string[] {
  const cacheKey = `${words.length}:${cycleIndex}`;
  const cached = cycleCache.get(cacheKey);
  if (cached) return cached;

  const shuffled = seededShuffle(words, deriveCycleSeed(cycleIndex));

  // If moving into Cycle 2+, prevent the first word of the new cycle from matching
  // the very last word of the previous cycle so no word repeats back-to-back at the boundary.
  if (cycleIndex > 0 && shuffled.length > 1) {
    const prevCycle = getShuffledCycleWords(words, cycleIndex - 1);
    const prevLastWord = prevCycle[prevCycle.length - 1];
    if (shuffled[0] === prevLastWord) {
      const swapIdx = shuffled.length - 1;
      const tmp = shuffled[0];
      shuffled[0] = shuffled[swapIdx];
      shuffled[swapIdx] = tmp;
    }
  }

  cycleCache.set(cacheKey, shuffled);
  return shuffled;
}

/**
 * Resolves the deterministic daily puzzle for a given `daysSinceEpoch`.
 * - Cycle 1 (`daysSinceEpoch < words.length`): indexes directly into `shuffledWords[daysSinceEpoch]`.
 * - Subsequent cycles (`daysSinceEpoch >= words.length`): deterministically reshuffles with a new
 *   cycle seed and flags `hasCompletedFirstCycle` so the UI can surface cycle progression clearly.
 */
export function getDailyPuzzle(
  words: readonly string[],
  daysSinceEpoch: number = getUtcDaysSinceEpoch(),
): DailyPuzzleInfo {
  if (words.length === 0) {
    throw new Error("Word list is empty; cannot select a daily Wordle target.");
  }

  const safeDay = Math.max(0, Math.floor(daysSinceEpoch));
  const totalWords = words.length;
  const cycleIndex = Math.floor(safeDay / totalWords);
  const indexInCycle = safeDay % totalWords;

  const cycleWords = getShuffledCycleWords(words, cycleIndex);
  const encodedTarget = encodeWord(cycleWords[indexInCycle]);

  return {
    daysSinceEpoch: safeDay,
    puzzleNumber: safeDay + 1,
    cycleNumber: cycleIndex + 1,
    indexInCycle,
    totalWords,
    hasCompletedFirstCycle: cycleIndex > 0,
    getTargetWord: () => decodeWord(encodedTarget),
  };
}

/**
 * Evaluates a 5-letter guess against the target word using exact Wordle duplicate-letter rules:
 * 1. Exact position matches (`correct` / green) are awarded first and consume target letter counts.
 * 2. Remaining positions are checked left-to-right: `present` (yellow) up to remaining target counts,
 *    otherwise `absent` (gray).
 */
export function evaluateGuess(guess: string, target: string): LetterState[] {
  const g = guess.toUpperCase();
  const t = target.toUpperCase();
  const result: LetterState[] = Array(WORD_LENGTH).fill("absent");
  const remainingCounts: Record<string, number> = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === t[i]) {
      result[i] = "correct";
    } else {
      const ch = t[i];
      remainingCounts[ch] = (remainingCounts[ch] ?? 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === "correct") continue;
    const ch = g[i];
    if ((remainingCounts[ch] ?? 0) > 0) {
      result[i] = "present";
      remainingCounts[ch] -= 1;
    }
  }

  return result;
}

const KEY_PRIORITY: Record<KeyState, number> = {
  unused: 0,
  absent: 1,
  present: 2,
  correct: 3,
};

/**
 * Computes upgraded QWERTY keyboard letter states across all submitted guesses.
 * Keys only upgrade (`unused` -> `absent` -> `present` -> `correct`) and never downgrade.
 */
export function computeKeyboardStates(
  guesses: readonly string[],
  evaluations: readonly LetterState[][],
): Record<string, KeyState> {
  const map: Record<string, KeyState> = {};

  for (let r = 0; r < guesses.length; r++) {
    const word = guesses[r];
    const rowEval = evaluations[r];
    if (!rowEval) continue;

    for (let c = 0; c < WORD_LENGTH; c++) {
      const letter = word[c];
      const nextState = rowEval[c] as KeyState;
      const prevState = map[letter] ?? "unused";
      if (KEY_PRIORITY[nextState] > KEY_PRIORITY[prevState]) {
        map[letter] = nextState;
      }
    }
  }

  return map;
}

export function createDefaultStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    guessDistribution: [0, 0, 0, 0, 0, 0],
    lastCompletedDay: null,
  };
}

export function loadPlayerStats(): PlayerStats {
  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return createDefaultStats();
    const parsed = JSON.parse(raw) as Partial<PlayerStats>;

    const dist: PlayerStats["guessDistribution"] =
      Array.isArray(parsed.guessDistribution) &&
      parsed.guessDistribution.length === MAX_GUESSES &&
      parsed.guessDistribution.every((n) => typeof n === "number" && n >= 0)
        ? [
            parsed.guessDistribution[0],
            parsed.guessDistribution[1],
            parsed.guessDistribution[2],
            parsed.guessDistribution[3],
            parsed.guessDistribution[4],
            parsed.guessDistribution[5],
          ]
        : [0, 0, 0, 0, 0, 0];

    return {
      gamesPlayed:
        typeof parsed.gamesPlayed === "number" ? parsed.gamesPlayed : 0,
      gamesWon: typeof parsed.gamesWon === "number" ? parsed.gamesWon : 0,
      currentStreak:
        typeof parsed.currentStreak === "number" ? parsed.currentStreak : 0,
      maxStreak: typeof parsed.maxStreak === "number" ? parsed.maxStreak : 0,
      guessDistribution: dist,
      lastCompletedDay:
        typeof parsed.lastCompletedDay === "number"
          ? parsed.lastCompletedDay
          : null,
    };
  } catch {
    return createDefaultStats();
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  try {
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota / private mode failures gracefully
  }
}

export function recordCompletedGame(
  prevStats: PlayerStats,
  daysSinceEpoch: number,
  won: boolean,
  guessCount: number,
): PlayerStats {
  // Anti-duplicate guard: never record stats twice for the same UTC day
  if (prevStats.lastCompletedDay === daysSinceEpoch) {
    return prevStats;
  }

  const gamesPlayed = prevStats.gamesPlayed + 1;
  const gamesWon = prevStats.gamesWon + (won ? 1 : 0);

  let currentStreak = 0;
  if (won) {
    const isConsecutive =
      prevStats.lastCompletedDay !== null &&
      daysSinceEpoch - prevStats.lastCompletedDay === 1;
    currentStreak = isConsecutive ? prevStats.currentStreak + 1 : 1;
  }

  const maxStreak = Math.max(prevStats.maxStreak, currentStreak);
  const guessDistribution: [number, number, number, number, number, number] = [
    ...prevStats.guessDistribution,
  ];

  if (won && guessCount >= 1 && guessCount <= MAX_GUESSES) {
    guessDistribution[guessCount - 1] += 1;
  }

  const updated: PlayerStats = {
    gamesPlayed,
    gamesWon,
    currentStreak,
    maxStreak,
    guessDistribution,
    lastCompletedDay: daysSinceEpoch,
  };

  savePlayerStats(updated);
  return updated;
}

/**
 * Loads and re-validates saved progress for `expectedDaysSinceEpoch`.
 * If the GMT day has rolled over, returns a clean board for the new puzzle.
 */
export function loadBoardStateForDay(
  expectedDaysSinceEpoch: number,
  targetWord: string,
  validWordSet: ReadonlySet<string>,
): StoredBoardState {
  const emptyState: StoredBoardState = {
    daysSinceEpoch: expectedDaysSinceEpoch,
    guesses: [],
    status: "playing",
  };

  try {
    const raw = window.localStorage.getItem(BOARD_STORAGE_KEY);
    if (!raw) return emptyState;

    const parsed = JSON.parse(raw) as Partial<StoredBoardState>;
    if (
      parsed.daysSinceEpoch !== expectedDaysSinceEpoch ||
      !Array.isArray(parsed.guesses)
    ) {
      return emptyState;
    }

    const validGuesses: string[] = [];
    let derivedStatus: GameStatus = "playing";

    for (const item of parsed.guesses.slice(0, MAX_GUESSES)) {
      if (typeof item !== "string") break;
      const upper = item.trim().toUpperCase();
      if (!/^[A-Z]{5}$/.test(upper) || !validWordSet.has(upper)) break;

      validGuesses.push(upper);
      if (upper === targetWord) {
        derivedStatus = "won";
        break;
      }
    }

    if (derivedStatus === "playing" && validGuesses.length >= MAX_GUESSES) {
      derivedStatus = "lost";
    }

    return {
      daysSinceEpoch: expectedDaysSinceEpoch,
      guesses: validGuesses,
      status: derivedStatus,
    };
  } catch {
    return emptyState;
  }
}

export function saveBoardState(state: StoredBoardState): void {
  try {
    window.localStorage.setItem(BOARD_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota / private mode failures gracefully
  }
}

/**
 * Builds the shareable emoji grid summary for clipboard engagement.
 */
export function buildShareSummary(params: {
  puzzleNumber: number;
  status: GameStatus;
  evaluations: readonly LetterState[][];
  shareUrl?: string;
}): string {
  const { puzzleNumber, status, evaluations, shareUrl } = params;
  const scoreLabel =
    status === "won"
      ? `${evaluations.length}/${MAX_GUESSES}`
      : `X/${MAX_GUESSES}`;

  const emojiRows = evaluations.map((row) =>
    row
      .map((cell) => {
        if (cell === "correct") return "🟩";
        if (cell === "present") return "🟨";
        return "⬛";
      })
      .join(""),
  );

  const url =
    shareUrl ??
    (typeof window !== "undefined"
      ? window.location.href
      : "https://puzzles.nouse.co.uk/wordle");

  return [
    `Daily Word #${puzzleNumber} ${scoreLabel}`,
    "",
    ...emojiRows,
    "",
    url,
  ].join("\n");
}

export interface WordDefinition {
  word: string;
  phonetic?: string;
  partOfSpeech?: string;
  definition: string;
}

export type CachedDefinitionLookup =
  | { status: "hit"; definition: WordDefinition }
  | { status: "not_found" }
  | { status: "miss" };

interface DictionaryApiPhonetic {
  text?: unknown;
}

interface DictionaryApiDefinitionItem {
  definition?: unknown;
}

interface DictionaryApiMeaning {
  partOfSpeech?: unknown;
  definitions?: unknown;
}

interface DictionaryApiEntry {
  word?: unknown;
  phonetic?: unknown;
  phonetics?: unknown;
  meanings?: unknown;
}

/**
 * Parses the Free Dictionary API (`data[0]`) payload into a clean `WordDefinition`,
 * or returns `null` if required fields are missing.
 */
export function parseDictionaryApiResponse(
  payload: unknown,
  fallbackWord: string,
): WordDefinition | null {
  if (!Array.isArray(payload) || payload.length === 0) return null;
  const entry = payload[0] as DictionaryApiEntry | null;
  if (!entry || typeof entry !== "object") return null;

  const rawWord =
    typeof entry.word === "string" && entry.word.trim().length > 0
      ? entry.word.trim()
      : fallbackWord;

  let phonetic: string | undefined;
  if (typeof entry.phonetic === "string" && entry.phonetic.trim().length > 0) {
    phonetic = entry.phonetic.trim();
  } else if (Array.isArray(entry.phonetics)) {
    const match = (entry.phonetics as DictionaryApiPhonetic[]).find(
      (p) => p && typeof p.text === "string" && p.text.trim().length > 0,
    );
    if (match && typeof match.text === "string") {
      phonetic = match.text.trim();
    }
  }

  if (!Array.isArray(entry.meanings) || entry.meanings.length === 0) {
    return null;
  }

  let partOfSpeech: string | undefined;
  let definitionText: string | undefined;

  for (const rawMeaning of entry.meanings as DictionaryApiMeaning[]) {
    if (!rawMeaning || typeof rawMeaning !== "object") continue;
    if (!Array.isArray(rawMeaning.definitions)) continue;

    const firstDef = (
      rawMeaning.definitions as DictionaryApiDefinitionItem[]
    ).find(
      (d) =>
        d && typeof d.definition === "string" && d.definition.trim().length > 0,
    );

    if (firstDef && typeof firstDef.definition === "string") {
      definitionText = firstDef.definition.trim();
      if (
        typeof rawMeaning.partOfSpeech === "string" &&
        rawMeaning.partOfSpeech.trim().length > 0
      ) {
        partOfSpeech = rawMeaning.partOfSpeech.trim();
      }
      break;
    }
  }

  if (!definitionText) return null;

  return {
    word: rawWord.toUpperCase(),
    ...(phonetic ? { phonetic } : {}),
    ...(partOfSpeech ? { partOfSpeech } : {}),
    definition: definitionText,
  };
}

export function getDefinitionCacheKey(word: string): string {
  return `${DEFINITION_CACHE_PREFIX}${word.trim().toUpperCase()}`;
}

export function readCachedWordDefinition(word: string): CachedDefinitionLookup {
  try {
    const raw = window.localStorage.getItem(getDefinitionCacheKey(word));
    if (!raw) return { status: "miss" };

    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== "object") return { status: "miss" };

    if (parsed.notFound === true) {
      return { status: "not_found" };
    }

    if (
      typeof parsed.word === "string" &&
      typeof parsed.definition === "string" &&
      parsed.definition.trim().length > 0
    ) {
      return {
        status: "hit",
        definition: {
          word: parsed.word.toUpperCase(),
          ...(typeof parsed.phonetic === "string" && parsed.phonetic.trim()
            ? { phonetic: parsed.phonetic.trim() }
            : {}),
          ...(typeof parsed.partOfSpeech === "string" &&
          parsed.partOfSpeech.trim()
            ? { partOfSpeech: parsed.partOfSpeech.trim() }
            : {}),
          definition: parsed.definition.trim(),
        },
      };
    }

    return { status: "miss" };
  } catch {
    return { status: "miss" };
  }
}

function writeCachedWordDefinition(
  word: string,
  value: WordDefinition | { notFound: true },
): void {
  try {
    window.localStorage.setItem(
      getDefinitionCacheKey(word),
      JSON.stringify(value),
    );
  } catch {
    // Ignore storage quota / private browsing errors gracefully
  }
}

/**
 * Fetches a word's definition from the Free Dictionary API with `localStorage` caching (`def_<WORD>`).
 * Fails silently (`null`) on network errors, timeouts, malformed payloads, or 404 responses.
 */
export async function fetchWordDefinition(
  targetWord: string,
  signal?: AbortSignal,
): Promise<WordDefinition | null> {
  const upperWord = targetWord.trim().toUpperCase();
  if (!upperWord) return null;

  const cached = readCachedWordDefinition(upperWord);
  if (cached.status === "hit") return cached.definition;
  if (cached.status === "not_found") return null;

  try {
    const response = await fetch(
      `${DICTIONARY_API_BASE}${encodeURIComponent(upperWord.toLowerCase())}`,
      { signal },
    );

    if (response.status === 404) {
      writeCachedWordDefinition(upperWord, { notFound: true });
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const json: unknown = await response.json();
    const parsed = parseDictionaryApiResponse(json, upperWord);
    if (!parsed) {
      writeCachedWordDefinition(upperWord, { notFound: true });
      return null;
    }

    writeCachedWordDefinition(upperWord, parsed);
    return parsed;
  } catch {
    return null;
  }
}
