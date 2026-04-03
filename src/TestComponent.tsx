import { useState, useRef, useCallback, useEffect, type JSX } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Direction = "across" | "down";
type CellValue = string | null; // null = black cell, "" = empty white cell
type Grid = CellValue[][];
type CellCoord = [row: number, col: number];
type NumberingMap = Record<string, number>;

interface Clue {
  num: number;
  clue: string;
}

interface ClueListProps {
  clues: Clue[];
  clueDir: Direction;
  title: string;
  activeClueNum: number | null;
  activeDir: Direction;
  onJump: (num: number, dir: Direction) => void;
}

// ── Puzzle data ────────────────────────────────────────────────────────────────

const B = true;
const _ = false;

const LAYOUT: boolean[][] = [
  [_, _, _, _, B, _, _, _, _],
  [_, B, _, B, _, B, _, B, _],
  [_, _, _, _, _, _, _, _, _],
  [B, _, B, _, B, _, B, _, B],
  [_, _, _, _, B, _, _, _, _],
  [B, _, B, _, B, _, B, _, B],
  [_, _, _, _, _, _, _, _, _],
  [_, B, _, B, _, B, _, B, _],
  [_, _, _, _, B, _, _, _, _],
];

const ANSWERS: (string | null)[][] = [
  ["S", "T", "A", "R", null, "M", "O", "O", "N"],
  ["P", null, "I", null, "O", null, "C", null, "E"],
  ["A", "T", "L", "A", "S", "B", "E", "A", "R"],
  [null, "H", null, "N", null, "L", null, "T", null],
  ["S", "E", "A", "S", null, "U", "N", "I", "T"],
  [null, "I", null, "W", null, "E", null, "L", null],
  ["R", "A", "D", "A", "R", "A", "C", "E", "S"],
  ["E", null, "E", null, "A", null, "I", null, "D"],
  ["D", "U", "N", "E", null, "L", "A", "K", "E"],
];

const ACROSS_CLUES: Clue[] = [
  { num: 1, clue: "Celestial body visible at night" },
  { num: 5, clue: "Earth's natural satellite" },
  { num: 7, clue: "Collection of maps in book form" },
  { num: 9, clue: "Bear-shaped honey container" },
  { num: 11, clue: "Ocean or large body of water" },
  { num: 13, clue: "Standard measure of quantity" },
  { num: 15, clue: "Palindrome: navigation device" },
  { num: 17, clue: "Sprints competitively" },
  { num: 19, clue: "Sandy landscape or film title" },
  { num: 21, clue: "Body of water smaller than sea" },
];

const DOWN_CLUES: Clue[] = [
  { num: 1, clue: "Spa or sauna treatment" },
  { num: 2, clue: "Celestial body with a tail" },
  { num: 3, clue: "Greek hero of the Iliad" },
  { num: 4, clue: "Road or path" },
  { num: 6, clue: "Bear: Latin" },
  { num: 8, clue: "Large bear of North America" },
  { num: 10, clue: "Instrument with 88 keys" },
  { num: 12, clue: "Open grassland" },
  { num: 14, clue: "Deer's antlers" },
  { num: 16, clue: "Electrical current unit" },
];

const ROWS = LAYOUT.length;
const COLS = LAYOUT[0].length;

// ── Build numbering map ────────────────────────────────────────────────────────

function buildNumbering(): NumberingMap {
  const map: NumberingMap = {};
  let n = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (LAYOUT[r][c]) continue;
      const acrossStart =
        (c === 0 || LAYOUT[r][c - 1]) && c + 1 < COLS && !LAYOUT[r][c + 1];
      const downStart =
        (r === 0 || LAYOUT[r - 1][c]) && r + 1 < ROWS && !LAYOUT[r + 1][c];
      if (acrossStart || downStart) map[`${r},${c}`] = ++n;
    }
  }
  return map;
}

const NUMBERING: NumberingMap = buildNumbering();

// ── Helpers ────────────────────────────────────────────────────────────────────

function getWordCells(r: number, c: number, dir: Direction): CellCoord[] {
  const cells: CellCoord[] = [];
  if (dir === "across") {
    let cc = c;
    while (cc > 0 && !LAYOUT[r][cc - 1]) cc--;
    while (cc < COLS && !LAYOUT[r][cc]) {
      cells.push([r, cc]);
      cc++;
    }
  } else {
    let rr = r;
    while (rr > 0 && !LAYOUT[rr - 1][c]) rr--;
    while (rr < ROWS && !LAYOUT[rr][c]) {
      cells.push([rr, c]);
      rr++;
    }
  }
  return cells;
}

function getWordStart(r: number, c: number, dir: Direction): CellCoord {
  return getWordCells(r, c, dir)[0] ?? [r, c];
}

function clueNumForCell(r: number, c: number, dir: Direction): number | null {
  const [sr, sc] = getWordStart(r, c, dir);
  return NUMBERING[`${sr},${sc}`] ?? null;
}

function buildInitialGrid(): Grid {
  return Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) => (LAYOUT[r][c] ? null : "")),
  );
}

// ── ClueList sub-component ─────────────────────────────────────────────────────

function ClueList({
  clues,
  clueDir,
  title,
  activeClueNum,
  activeDir,
  onJump,
}: ClueListProps): JSX.Element {
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-[10px] font-semibold tracking-widest uppercase text-neutral-400 mb-2 pb-1 border-b border-neutral-200">
        {title}
      </h3>
      <ul className="space-y-0.5">
        {clues.map(({ num, clue }) => {
          const isActive = clueDir === activeDir && num === activeClueNum;
          return (
            <li key={num}>
              <button
                onClick={() => onJump(num, clueDir)}
                className={`w-full text-left flex gap-2 px-1.5 py-1 rounded text-xs leading-snug transition-colors ${
                  isActive
                    ? "bg-sky-100 text-sky-800"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                <span className="font-semibold text-neutral-400 shrink-0 w-4 text-right">
                  {num}
                </span>
                <span>{clue}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Crossword(): JSX.Element {
  const [grid, setGrid] = useState<Grid>(buildInitialGrid);
  const [dir, setDir] = useState<Direction>("across");
  const [active, setActive] = useState<CellCoord | null>(null);
  const [checked, setChecked] = useState(false);
  const [showClues, setShowClues] = useState(false);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const focusCell = useCallback((r: number, c: number): void => {
    inputRefs.current[`${r},${c}`]?.focus();
  }, []);

  const wordCells: Set<string> = active
    ? new Set(getWordCells(...active, dir).map(([r, c]) => `${r},${c}`))
    : new Set();
  const activeKey = active ? `${active[0]},${active[1]}` : null;
  const activeClueNum = active ? clueNumForCell(...active, dir) : null;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleFocus(r: number, c: number): void {
    setActive([r, c]);
    setChecked(false);
  }

  function handleCellClick(r: number, c: number): void {
    if (active && active[0] === r && active[1] === c) {
      setDir((d) => (d === "across" ? "down" : "across"));
    } else {
      setActive([r, c]);
    }
  }

  function moveInDir(r: number, c: number, d: Direction, delta: number): void {
    const cells = getWordCells(r, c, d);
    const idx = cells.findIndex(([rr, cc]) => rr === r && cc === c);
    const ni = idx + delta;
    if (ni >= 0 && ni < cells.length) focusCell(...cells[ni]);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number,
  ): void {
    const cells = getWordCells(r, c, dir);
    const idx = cells.findIndex(([rr, cc]) => rr === r && cc === c);

    if (e.key === "Backspace") {
      e.preventDefault();
      if (grid[r][c] !== "") {
        setGrid((g) =>
          g.map((row, rr) =>
            row.map((v, cc) => (rr === r && cc === c ? "" : v)),
          ),
        );
      } else if (idx > 0) {
        const [pr, pc] = cells[idx - 1];
        setGrid((g) =>
          g.map((row, rr) =>
            row.map((v, cc) => (rr === pr && cc === pc ? "" : v)),
          ),
        );
        focusCell(pr, pc);
      }
      return;
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setDir("across");
      moveInDir(r, c, "across", 1);
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setDir("across");
      moveInDir(r, c, "across", -1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setDir("down");
      moveInDir(r, c, "down", 1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setDir("down");
      moveInDir(r, c, "down", -1);
      return;
    }
  }

  function handleInput(
    e: React.FormEvent<HTMLInputElement>,
    r: number,
    c: number,
  ): void {
    const val = (e.currentTarget.value ?? "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase();
    const letter = val ? val[val.length - 1] : "";
    setGrid((g) =>
      g.map((row, rr) =>
        row.map((v, cc) => (rr === r && cc === c ? letter : v)),
      ),
    );
    setChecked(false);
    if (letter) {
      const cells = getWordCells(r, c, dir);
      const idx = cells.findIndex(([rr, cc]) => rr === r && cc === c);
      if (idx < cells.length - 1) focusCell(...cells[idx + 1]);
    }
  }

  function jumpToClue(num: number, clueDir: Direction): void {
    setDir(clueDir);
    setShowClues(false);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (NUMBERING[`${r},${c}`] === num) {
          focusCell(r, c);
          return;
        }
      }
    }
  }

  function handleClear(): void {
    setGrid(buildInitialGrid());
    setChecked(false);
    setActive(null);
  }

  // Sync uncontrolled input values after state update
  useEffect(() => {
    if (!active) return;
    const inp = inputRefs.current[`${active[0]},${active[1]}`];
    if (inp) inp.value = grid[active[0]][active[1]] ?? "";
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const filledCount = grid.flat().filter((v) => v !== null && v !== "").length;
  const totalCount = grid.flat().filter((v) => v !== null).length;

  const activeClue: Clue | undefined =
    activeClueNum !== null
      ? (dir === "across" ? ACROSS_CLUES : DOWN_CLUES).find(
          (cl) => cl.num === activeClueNum,
        )
      : undefined;

  const checkStats = (() => {
    if (!checked) return null;
    let ok = 0,
      bad = 0,
      empty = 0;
    grid.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v === null) return;
        if (!v) empty++;
        else if (v === ANSWERS[r][c]) ok++;
        else bad++;
      }),
    );
    return `${ok} correct · ${bad} wrong · ${empty} empty`;
  })();

  // ── Cell helpers ───────────────────────────────────────────────────────────

  function cellBg(r: number, c: number): string {
    const key = `${r},${c}`;
    if (LAYOUT[r][c]) return "bg-neutral-900";
    if (key === activeKey) return "bg-sky-300";
    if (wordCells.has(key)) return "bg-sky-100";
    return "bg-white";
  }

  function cellTextColor(r: number, c: number): string {
    if (!checked || LAYOUT[r][c] || !grid[r][c]) return "text-neutral-900";
    return grid[r][c] === ANSWERS[r][c] ? "text-emerald-600" : "text-red-500";
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center py-6 px-3 font-mono">
      {/* Header */}
      <div className="w-full max-w-3xl mb-5 flex items-end justify-between">
        <div>
          <p className="text-[10px] tracking-widest uppercase text-neutral-400 mb-0.5">
            Nouse Edition #530 - Published 03/4/2026
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Crossword
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs text-neutral-400">
            {filledCount}/{totalCount} filled
          </p>
          <div className="w-24 h-1 bg-neutral-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-300"
              style={{ width: `${(filledCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="w-full max-w-3xl flex flex-col lg:flex-row gap-6">
        {/* Left column: grid + controls */}
        <div className="flex flex-col items-center lg:items-start gap-3">
          {/* Mobile: active clue bar */}
          {activeClue && (
            <div className="lg:hidden w-full flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5">
              <span className="text-sky-400 font-bold text-xs shrink-0 uppercase tracking-wider">
                {activeClueNum} {dir === "across" ? "→" : "↓"}
              </span>
              <span className="text-sm text-sky-800 leading-snug font-sans">
                {activeClue.clue}
              </span>
            </div>
          )}

          {/* Grid */}
          <div
            className="border-2 border-neutral-900 rounded-sm overflow-hidden shadow-sm"
            style={{ lineHeight: 0 }}
          >
            {LAYOUT.map((row, r) => (
              <div key={r} className="flex">
                {row.map((isBlack, c) => {
                  const num = NUMBERING[`${r},${c}`];
                  return (
                    <div
                      key={c}
                      onClick={() => !isBlack && handleCellClick(r, c)}
                      className={`
                        relative border-[0.5px] border-neutral-300
                        ${cellBg(r, c)}
                        ${isBlack ? "border-neutral-900" : "cursor-text"}
                        transition-colors duration-100
                        w-9 h-9 sm:w-11 sm:h-11
                      `}
                    >
                      {num !== undefined && (
                        <span className="absolute top-[2px] left-[2px] text-[7px] sm:text-[9px] font-medium text-neutral-500 leading-none select-none pointer-events-none z-10">
                          {num}
                        </span>
                      )}
                      {!isBlack && (
                        <input
                          ref={(el) => {
                            inputRefs.current[`${r},${c}`] = el;
                          }}
                          defaultValue={grid[r][c] ?? ""}
                          maxLength={1}
                          onFocus={() => handleFocus(r, c)}
                          onClick={() => handleCellClick(r, c)}
                          onKeyDown={(e) => handleKeyDown(e, r, c)}
                          onInput={(e) => handleInput(e, r, c)}
                          className={`
                            absolute inset-0 w-full h-full
                            bg-transparent border-none outline-none
                            text-center font-bold uppercase
                            text-base sm:text-lg
                            pt-3 sm:pt-4
                            ${cellTextColor(r, c)}
                            cursor-pointer focus:outline-none
                          `}
                          style={{ caretColor: "transparent" }}
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 w-full justify-center lg:justify-start flex-wrap">
            <button
              onClick={() => setChecked(true)}
              className="text-xs px-4 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all font-sans"
            >
              Check answers
            </button>
            <button
              onClick={handleClear}
              className="text-xs px-4 py-2 rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100 active:scale-95 transition-all font-sans"
            >
              Clear
            </button>
            {/* Mobile-only clue toggle */}
            <button
              onClick={() => setShowClues((s) => !s)}
              className="lg:hidden text-xs px-4 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 active:scale-95 transition-all font-sans ml-auto"
            >
              {showClues ? "Hide clues" : "Show clues"}
            </button>
          </div>

          {/* Check result */}
          {checkStats && (
            <p className="text-xs text-neutral-500 font-sans">{checkStats}</p>
          )}
        </div>

        {/* Right column: clues */}
        <div
          className={`${
            showClues ? "flex" : "hidden"
          } lg:flex flex-row lg:flex-col gap-5 flex-1 bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm font-sans self-start`}
        >
          <ClueList
            clues={ACROSS_CLUES}
            clueDir="across"
            title="Across"
            activeClueNum={activeClueNum}
            activeDir={dir}
            onJump={jumpToClue}
          />
          <div className="hidden lg:block h-px bg-neutral-100 my-1" />
          <ClueList
            clues={DOWN_CLUES}
            clueDir="down"
            title="Down"
            activeClueNum={activeClueNum}
            activeDir={dir}
            onJump={jumpToClue}
          />
        </div>
      </div>
    </div>
  );
}
