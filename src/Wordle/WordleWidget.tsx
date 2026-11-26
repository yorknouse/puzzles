import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import defaultWordsJson from "./words.json";
import {
  WORD_LENGTH,
  MAX_GUESSES,
  normalizeWordList,
  getUtcDaysSinceEpoch,
  getMsUntilNextUtcMidnight,
  formatCountdownHms,
  getDailyPuzzle,
  evaluateGuess,
  computeKeyboardStates,
  loadBoardStateForDay,
  saveBoardState,
  loadPlayerStats,
  recordCompletedGame,
  buildShareSummary,
  readCachedWordDefinition,
  fetchWordDefinition,
} from "./wordleEngine";
import type {
  GameStatus,
  PlayerStats,
  RawWordsSource,
  WordDefinition,
} from "./wordleEngine";
import "./WordleWidget.css";

const ROW_INDICES = [0, 1, 2, 3, 4, 5] as const;
const COL_INDICES = [0, 1, 2, 3, 4] as const;

const KEYBOARD_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "BACKSPACE"],
] as const;

const WIN_MESSAGES = [
  "Genius!",
  "Magnificent!",
  "Impressive!",
  "Splendid!",
  "Great!",
  "Phew!",
];

export interface WordleWidgetProps {
  /** Optional custom word list data; defaults to local `src/Wordle/words.json`. */
  wordsData?: RawWordsSource;
  /** Optional URL to fetch a `words.json` file dynamically when embedded externally. */
  wordsUrl?: string;
  /** Optional canonical share URL included in the copied emoji summary. */
  shareUrl?: string;
  /** Optional widget title override. */
  title?: string;
}

type ActiveModal = "help" | "stats" | null;

interface ResolvedDefinitionState {
  forWord: string;
  definition: WordDefinition | null;
}

const DEFINITION_TIMEOUT_MS = 6500;

export default function WordleWidget({
  wordsData,
  wordsUrl,
  shareUrl,
  title = "Daily Wordle",
}: WordleWidgetProps) {
  const [fetchedWords, setFetchedWords] = useState<RawWordsSource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const wordList = useMemo(() => {
    const raw =
      fetchedWords ?? wordsData ?? (defaultWordsJson as RawWordsSource);
    return normalizeWordList(raw);
  }, [fetchedWords, wordsData]);

  const validWordSet = useMemo(() => new Set(wordList), [wordList]);

  const [daysSinceEpoch, setDaysSinceEpoch] = useState<number>(() =>
    getUtcDaysSinceEpoch(),
  );

  const puzzle = useMemo(
    () => getDailyPuzzle(wordList, daysSinceEpoch),
    [wordList, daysSinceEpoch],
  );

  const initialBoard = useMemo(
    () =>
      loadBoardStateForDay(
        puzzle.daysSinceEpoch,
        puzzle.getTargetWord(),
        validWordSet,
      ),
    [puzzle, validWordSet],
  );

  const [guesses, setGuesses] = useState<string[]>(() => initialBoard.guesses);
  const [status, setStatus] = useState<GameStatus>(() => initialBoard.status);
  const [currentInput, setCurrentInput] = useState<string>("");
  const [stats, setStats] = useState<PlayerStats>(() => {
    const loaded = loadPlayerStats();
    if (initialBoard.status !== "playing") {
      return recordCompletedGame(
        loaded,
        initialBoard.daysSinceEpoch,
        initialBoard.status === "won",
        initialBoard.guesses.length,
      );
    }
    return loaded;
  });

  useEffect(() => {
    if (!wordsUrl) return;
    let cancelled = false;

    fetch(wordsUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<RawWordsSource>;
      })
      .then((json) => {
        if (!cancelled) {
          const normalized = normalizeWordList(json);
          if (normalized.length > 0) {
            const nextValidSet = new Set(normalized);
            const currentDay = getUtcDaysSinceEpoch();
            const nextPuzzle = getDailyPuzzle(normalized, currentDay);
            const restored = loadBoardStateForDay(
              nextPuzzle.daysSinceEpoch,
              nextPuzzle.getTargetWord(),
              nextValidSet,
            );
            setFetchedWords(json);
            setDaysSinceEpoch(currentDay);
            setGuesses(restored.guesses);
            setStatus(restored.status);
            setCurrentInput("");
            setLoadError(null);
          } else {
            setLoadError("Word list was empty. Using bundled dictionary.");
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError("Unable to load word list. Using bundled dictionary.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [wordsUrl]);

  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [shakingRow, setShakingRow] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [countdown, setCountdown] = useState<string>(() =>
    formatCountdownHms(getMsUntilNextUtcMidnight()),
  );
  const [resolvedDef, setResolvedDef] =
    useState<ResolvedDefinitionState | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const currentDayRef = useRef<number>(daysSinceEpoch);

  const showToast = useCallback((message: string, durationMs = 1900) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, durationMs);
  }, []);

  const triggerRowShake = useCallback(
    (rowIdx: number, reason: string) => {
      setShakingRow(rowIdx);
      showToast(reason, 1600);
      window.setTimeout(() => {
        setShakingRow((prev) => (prev === rowIdx ? null : prev));
      }, 480);
    },
    [showToast],
  );

  // Live 1-second GMT countdown & automatic 00:00 GMT day rollover
  useEffect(() => {
    currentDayRef.current = daysSinceEpoch;
  }, [daysSinceEpoch]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const now = new Date();
      setCountdown(formatCountdownHms(getMsUntilNextUtcMidnight(now)));

      const latestUtcDay = getUtcDaysSinceEpoch(now);
      if (latestUtcDay !== currentDayRef.current) {
        currentDayRef.current = latestUtcDay;
        setDaysSinceEpoch(latestUtcDay);
        setGuesses([]);
        setStatus("playing");
        setCurrentInput("");
        setRevealingRow(null);
        setCopiedFeedback(false);
        saveBoardState({
          daysSinceEpoch: latestUtcDay,
          guesses: [],
          status: "playing",
        });
        showToast("00:00 GMT — Today's new Wordle is live!", 3000);
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [showToast]);

  const evaluations = useMemo(() => {
    const target = puzzle.getTargetWord();
    return guesses.map((guess) => evaluateGuess(guess, target));
  }, [guesses, puzzle]);

  const keyboardStates = useMemo(
    () => computeKeyboardStates(guesses, evaluations),
    [guesses, evaluations],
  );

  // End-of-game Free Dictionary API lookup with localStorage cache (`def_<WORD>`)
  const completedWord = status !== "playing" ? puzzle.getTargetWord() : null;
  const cachedDefLookup = useMemo(
    () =>
      completedWord
        ? readCachedWordDefinition(completedWord)
        : { status: "miss" as const },
    [completedWord],
  );

  const activeDefinition: WordDefinition | null =
    completedWord === null
      ? null
      : cachedDefLookup.status === "hit"
        ? cachedDefLookup.definition
        : resolvedDef?.forWord === completedWord
          ? resolvedDef.definition
          : null;

  const isDefinitionLoading =
    completedWord !== null &&
    cachedDefLookup.status === "miss" &&
    resolvedDef?.forWord !== completedWord;

  useEffect(() => {
    if (!completedWord) return;
    const cached = readCachedWordDefinition(completedWord);
    if (cached.status !== "miss") return;
    if (resolvedDef?.forWord === completedWord) return;

    let mounted = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      DEFINITION_TIMEOUT_MS,
    );

    fetchWordDefinition(completedWord, controller.signal).then((def) => {
      window.clearTimeout(timeoutId);
      if (mounted) {
        setResolvedDef({ forWord: completedWord, definition: def });
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [completedWord, resolvedDef?.forWord]);

  const submitGuess = useCallback(() => {
    if (status !== "playing") return;

    const rowIdx = guesses.length;
    if (rowIdx >= MAX_GUESSES) return;

    if (currentInput.length < WORD_LENGTH) {
      triggerRowShake(rowIdx, "Not enough letters");
      return;
    }

    const candidate = currentInput.toUpperCase();
    if (!validWordSet.has(candidate)) {
      triggerRowShake(rowIdx, "Not in word list");
      return;
    }

    const target = puzzle.getTargetWord();
    const nextGuesses = [...guesses, candidate];
    const isWin = candidate === target;
    const isLoss = !isWin && nextGuesses.length >= MAX_GUESSES;
    const nextStatus: GameStatus = isWin ? "won" : isLoss ? "lost" : "playing";

    setGuesses(nextGuesses);
    setCurrentInput("");
    setStatus(nextStatus);
    setRevealingRow(rowIdx);

    saveBoardState({
      daysSinceEpoch: puzzle.daysSinceEpoch,
      guesses: nextGuesses,
      status: nextStatus,
    });

    window.setTimeout(() => {
      setRevealingRow((prev) => (prev === rowIdx ? null : prev));
    }, 1050);

    if (nextStatus !== "playing") {
      setStats((prev) =>
        recordCompletedGame(
          prev,
          puzzle.daysSinceEpoch,
          isWin,
          nextGuesses.length,
        ),
      );

      if (isWin) {
        const praise =
          WIN_MESSAGES[
            Math.min(nextGuesses.length - 1, WIN_MESSAGES.length - 1)
          ];
        window.setTimeout(() => showToast(praise, 2400), 650);
      } else {
        window.setTimeout(() => showToast(`Answer: ${target}`, 3500), 650);
      }

      window.setTimeout(() => {
        setActiveModal("stats");
      }, 1500);
    }
  }, [
    currentInput,
    guesses,
    puzzle,
    showToast,
    status,
    triggerRowShake,
    validWordSet,
  ]);

  const handleKeyInput = useCallback(
    (key: string) => {
      if (status !== "playing") return;

      if (key === "ENTER") {
        submitGuess();
        return;
      }

      if (key === "BACKSPACE") {
        setCurrentInput((prev) => prev.slice(0, -1));
        return;
      }

      if (/^[A-Z]$/.test(key)) {
        setCurrentInput((prev) =>
          prev.length < WORD_LENGTH ? prev + key : prev,
        );
      }
    },
    [status, submitGuess],
  );

  // Physical keyboard support (scoped safely so inputs elsewhere on a news page keep working)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl &&
        (targetEl.tagName === "INPUT" ||
          targetEl.tagName === "TEXTAREA" ||
          targetEl.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape" && activeModal !== null) {
        setActiveModal(null);
        return;
      }

      if (activeModal !== null || status !== "playing") return;

      if (e.key === "Enter") {
        e.preventDefault();
        handleKeyInput("ENTER");
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleKeyInput("BACKSPACE");
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        handleKeyInput(e.key.toUpperCase());
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeModal, handleKeyInput, status]);

  const handleShare = useCallback(async () => {
    if (status === "playing") return;

    const text = buildShareSummary({
      puzzleNumber: puzzle.puzzleNumber,
      status,
      evaluations,
      shareUrl,
    });

    let copied = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch {
        copied = false;
      }
    }

    if (!copied) {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        copied = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedFeedback(true);
      showToast("Copied results to clipboard!", 2200);
      window.setTimeout(() => setCopiedFeedback(false), 2400);
    } else {
      showToast("Could not access clipboard", 2200);
    }
  }, [evaluations, puzzle.puzzleNumber, shareUrl, showToast, status]);

  const winPercentage =
    stats.gamesPlayed === 0
      ? 0
      : Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
  const maxDistCount = Math.max(1, ...stats.guessDistribution);

  return (
    <section className="nw-widget" aria-label="Nouse Daily Wordle">
      {/* Header */}
      <header className="nw-header">
        <div className="nw-brand">
          <h2 className="nw-title">
            {title} #{puzzle.puzzleNumber}
          </h2>
          <span className="nw-subtitle">
            Resets daily at 00:00 GMT
            {puzzle.hasCompletedFirstCycle
              ? ` · Cycle ${puzzle.cycleNumber}`
              : ""}
          </span>
        </div>

        <div className="nw-actions">
          <button
            type="button"
            className="nw-icon-btn"
            onClick={() => setActiveModal("help")}
            aria-label="How to play"
            title="How to play"
          >
            ?
          </button>
          <button
            type="button"
            className="nw-icon-btn"
            onClick={() => setActiveModal("stats")}
            aria-label="View statistics"
            title="Statistics"
          >
            📊
          </button>
        </div>
      </header>

      {/* Explicit non-repeating cycle rollover banner when Cycle 1 finishes */}
      {puzzle.hasCompletedFirstCycle && (
        <div className="nw-cycle-banner" role="status">
          Cycle {puzzle.cycleNumber - 1} Complete! All{" "}
          {puzzle.totalWords.toLocaleString()} words have appeared once — now
          playing reshuffled Cycle {puzzle.cycleNumber} (Word{" "}
          {puzzle.indexInCycle + 1} of {puzzle.totalWords.toLocaleString()}).
        </div>
      )}

      {/* Toast message region */}
      <div className="nw-toast-region" aria-live="polite" aria-atomic="true">
        {(toast ?? loadError) && (
          <div className="nw-toast">{toast ?? loadError}</div>
        )}
      </div>

      {/* 6x5 Letter Grid */}
      <div className="nw-board" role="grid" aria-label="Wordle guess grid">
        {ROW_INDICES.map((rowIdx) => {
          const isSubmitted = rowIdx < guesses.length;
          const isCurrentRow =
            rowIdx === guesses.length && status === "playing";
          const rowWord = isSubmitted
            ? guesses[rowIdx]
            : isCurrentRow
              ? currentInput
              : "";
          const rowEval = isSubmitted ? evaluations[rowIdx] : null;
          const isShaking = shakingRow === rowIdx;
          const isRevealing = revealingRow === rowIdx;

          return (
            <div
              key={rowIdx}
              role="row"
              className={`nw-row ${isShaking ? "nw-row-shake" : ""}`}
            >
              {COL_INDICES.map((colIdx) => {
                const letter = rowWord[colIdx] ?? "";
                const evalState = rowEval ? rowEval[colIdx] : "empty";

                const tileClasses = ["nw-tile"];
                if (isSubmitted) {
                  tileClasses.push(`nw-tile-${evalState}`);
                  if (isRevealing) {
                    tileClasses.push("nw-tile-reveal");
                  }
                } else if (letter) {
                  tileClasses.push("nw-tile-active");
                }

                const delayStyle: CSSProperties | undefined = isRevealing
                  ? ({ "--nw-delay": `${colIdx * 105}ms` } as CSSProperties)
                  : undefined;

                return (
                  <div
                    key={colIdx}
                    role="gridcell"
                    aria-label={
                      letter
                        ? `${letter}, ${isSubmitted ? evalState : "entered"}`
                        : "empty"
                    }
                    className={tileClasses.join(" ")}
                    style={delayStyle}
                  >
                    {letter}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Inline completion summary + live GMT countdown */}
      {status !== "playing" && (
        <div
          className="nw-complete-bar"
          role="region"
          aria-label="Puzzle summary"
        >
          <div className="nw-complete-top">
            <div className="nw-complete-info">
              <span className="nw-complete-headline">
                {status === "won"
                  ? `Solved in ${guesses.length}/${MAX_GUESSES}!`
                  : `Today's word: ${puzzle.getTargetWord()}`}
              </span>
              <span className="nw-complete-timer">
                Next puzzle (00:00 GMT): <strong>{countdown}</strong>
              </span>
            </div>
            <div className="nw-complete-buttons">
              <button
                type="button"
                className="nw-secondary-btn"
                onClick={() => setActiveModal("stats")}
              >
                Stats
              </button>
              <button
                type="button"
                className="nw-primary-btn"
                onClick={handleShare}
              >
                {copiedFeedback ? "Copied!" : "Share"}
              </button>
            </div>
          </div>

          {isDefinitionLoading && (
            <p className="nw-definition-loading">Loading definition...</p>
          )}
          {activeDefinition && (
            <div className="nw-definition-card">
              <p className="nw-definition-entry">
                <strong className="nw-definition-word">
                  {activeDefinition.word}
                </strong>
                {activeDefinition.phonetic && (
                  <span className="nw-definition-phonetic">
                    {" "}
                    {activeDefinition.phonetic}
                  </span>
                )}
                {activeDefinition.partOfSpeech && (
                  <em className="nw-definition-pos">
                    {" "}
                    ({activeDefinition.partOfSpeech})
                  </em>
                )}
                {" — "}
                <span className="nw-definition-text">
                  {activeDefinition.definition}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* On-screen QWERTY Keyboard */}
      <div className="nw-keyboard" role="group" aria-label="On-screen keyboard">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="nw-kb-row">
            {rIdx === 1 && <span className="nw-kb-spacer" aria-hidden="true" />}
            {row.map((key) => {
              const isWide = key === "ENTER" || key === "BACKSPACE";
              const keyState = !isWide
                ? (keyboardStates[key] ?? "unused")
                : "unused";
              const stateClass =
                keyState !== "unused" ? `nw-key-${keyState}` : "";

              return (
                <button
                  key={key}
                  type="button"
                  disabled={status !== "playing"}
                  onClick={() => handleKeyInput(key)}
                  aria-label={
                    key === "BACKSPACE"
                      ? "Backspace"
                      : key === "ENTER"
                        ? "Submit guess"
                        : key
                  }
                  className={`nw-key ${isWide ? "nw-key-wide" : ""} ${stateClass}`}
                >
                  {key === "BACKSPACE" ? "⌫" : key}
                </button>
              );
            })}
            {rIdx === 1 && <span className="nw-kb-spacer" aria-hidden="true" />}
          </div>
        ))}
      </div>

      {/* How to Play Modal */}
      {activeModal === "help" && (
        <div
          className="nw-modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="presentation"
        >
          <div
            className="nw-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nw-help-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nw-modal-header">
              <h3 id="nw-help-heading" className="nw-modal-title">
                How to Play
              </h3>
              <button
                type="button"
                className="nw-modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <p className="nw-help-text">
              Guess the Nouse daily word in <strong>6 tries</strong>.
            </p>
            <ul className="nw-help-list">
              <li>Each guess must be a valid 5-letter word.</li>
              <li>
                Tile colours update after each guess to show how close your word
                was.
              </li>
              <li>
                Every reader worldwide gets the exact same puzzle at{" "}
                <strong>00:00 GMT</strong>, with zero repeats until all{" "}
                {puzzle.totalWords.toLocaleString()} words have been played.
              </li>
            </ul>

            <div className="nw-example-block">
              <div className="nw-example-row" aria-hidden="true">
                <span className="nw-mini-tile nw-tile-correct">M</span>
                <span className="nw-mini-tile">U</span>
                <span className="nw-mini-tile">S</span>
                <span className="nw-mini-tile">I</span>
                <span className="nw-mini-tile">C</span>
              </div>
              <p className="nw-example-caption">
                <strong>M</strong> is in the word and in the correct spot.
              </p>
            </div>

            <div className="nw-example-block">
              <div className="nw-example-row" aria-hidden="true">
                <span className="nw-mini-tile">P</span>
                <span className="nw-mini-tile nw-tile-present">R</span>
                <span className="nw-mini-tile">E</span>
                <span className="nw-mini-tile">S</span>
                <span className="nw-mini-tile">S</span>
              </div>
              <p className="nw-example-caption">
                <strong>R</strong> is in the word but in the wrong spot.
              </p>
            </div>

            <div className="nw-example-block">
              <div className="nw-example-row" aria-hidden="true">
                <span className="nw-mini-tile">D</span>
                <span className="nw-mini-tile">R</span>
                <span className="nw-mini-tile">A</span>
                <span className="nw-mini-tile nw-tile-absent">F</span>
                <span className="nw-mini-tile">T</span>
              </div>
              <p className="nw-example-caption">
                <strong>F</strong> is not in the word in any spot.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {activeModal === "stats" && (
        <div
          className="nw-modal-backdrop"
          onClick={() => setActiveModal(null)}
          role="presentation"
        >
          <div
            className="nw-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nw-stats-heading"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="nw-modal-header">
              <h3 id="nw-stats-heading" className="nw-modal-title">
                {status === "won"
                  ? "Congratulations!"
                  : status === "lost"
                    ? `Today's Word: ${puzzle.getTargetWord()}`
                    : "Statistics"}
              </h3>
              <button
                type="button"
                className="nw-modal-close"
                onClick={() => setActiveModal(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {status !== "playing" && isDefinitionLoading && (
              <p className="nw-definition-loading nw-definition-modal-spacing">
                Loading definition...
              </p>
            )}
            {status !== "playing" && activeDefinition && (
              <div className="nw-definition-card nw-definition-modal-spacing">
                <p className="nw-definition-entry">
                  <strong className="nw-definition-word">
                    {activeDefinition.word}
                  </strong>
                  {activeDefinition.phonetic && (
                    <span className="nw-definition-phonetic">
                      {" "}
                      {activeDefinition.phonetic}
                    </span>
                  )}
                  {activeDefinition.partOfSpeech && (
                    <em className="nw-definition-pos">
                      {" "}
                      ({activeDefinition.partOfSpeech})
                    </em>
                  )}
                  {" — "}
                  <span className="nw-definition-text">
                    {activeDefinition.definition}
                  </span>
                </p>
              </div>
            )}

            <div className="nw-stats-grid">
              <div className="nw-stat-box">
                <div className="nw-stat-value">{stats.gamesPlayed}</div>
                <div className="nw-stat-label">Played</div>
              </div>
              <div className="nw-stat-box">
                <div className="nw-stat-value">{winPercentage}%</div>
                <div className="nw-stat-label">Win %</div>
              </div>
              <div className="nw-stat-box">
                <div className="nw-stat-value">{stats.currentStreak}</div>
                <div className="nw-stat-label">Current Streak</div>
              </div>
              <div className="nw-stat-box">
                <div className="nw-stat-value">{stats.maxStreak}</div>
                <div className="nw-stat-label">Max Streak</div>
              </div>
            </div>

            <h4 className="nw-section-heading">Guess Distribution</h4>
            <div className="nw-dist-list">
              {stats.guessDistribution.map((count, idx) => {
                const widthPct = Math.max(
                  8,
                  Math.round((count / maxDistCount) * 100),
                );
                const isTodayWinRow =
                  status === "won" && guesses.length === idx + 1;

                return (
                  <div key={idx} className="nw-dist-row">
                    <span className="nw-dist-num">{idx + 1}</span>
                    <div className="nw-dist-bar-track">
                      <div
                        className={`nw-dist-bar ${isTodayWinRow ? "nw-dist-bar-highlight" : ""}`}
                        style={{ width: `${widthPct}%` }}
                      >
                        {count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="nw-modal-footer">
              <div className="nw-countdown-box">
                <span className="nw-countdown-label">Next Wordle (GMT)</span>
                <span className="nw-countdown-clock">{countdown}</span>
              </div>

              {status !== "playing" && (
                <button
                  type="button"
                  className="nw-primary-btn"
                  onClick={handleShare}
                >
                  {copiedFeedback ? "Copied!" : "Share Results"}
                </button>
              )}
            </div>

            <p className="nw-schedule-note">
              Cycle {puzzle.cycleNumber} · Day {puzzle.indexInCycle + 1} of{" "}
              {puzzle.totalWords.toLocaleString()} non-repeating words
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
