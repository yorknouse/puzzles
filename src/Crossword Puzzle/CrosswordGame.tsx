import { useState, useRef } from "react";
import type { CrosswordPuzzle } from "./crossword";
import { Link } from "react-router-dom";

const p2 = "./Crosswords/puzzle2.json";
const puzzles = import.meta.glob("./Crosswords/*.json", { eager: true });
const puzzle2 = puzzles[p2] as CrosswordPuzzle;

type Props = {
  puzzle?: CrosswordPuzzle;
};

export default function CrosswordGame({ puzzle = puzzle2 }: Props) {
  const size = puzzle.size;
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const answerGrid = puzzle.answerGrid;

  const workingGridBuilder: string[] = answerGrid.map((value: string) =>
    value !== "0" ? "1" : "0",
  );
  const sourceGrid = workingGridBuilder;
  const [workingGrid, setWorkingGrid] = useState<string[]>(() =>
    sourceGrid.map((cell) => (cell === "0" ? "0" : "")),
  );

  const direction = useRef<"left" | "up" | "none">("none");
  const rows: string[][] = [];
  const sourceRows: string[][] = [];

  for (let r = 0; r < size; r++) {
    rows.push(workingGrid.slice(r * size, r * size + size));
    sourceRows.push(sourceGrid.slice(r * size, r * size + size));
  }

  const numberedCells: { [index: number]: number } = {};
  let nextNumber = 1;

  const generateCellNumber = (r: number, c: number) => {
    const value = answerGrid[r * size + c];
    if (value === "0") return false;
    if (value.toUpperCase() === value) {
      return true;
    }
    return false;
  };

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (generateCellNumber(r, c)) {
        numberedCells[r * size + c] = nextNumber;
        nextNumber += 1;
      }
    }
  }

  //i should make it so it knows if youre on a horizontal or vertical word, so you can move the correct way. DONE
  const handleKeyDown = (
    r: number,
    c: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    let newR = r;
    let newC = c;

    if (e.key.match(/[a-z]/) && e.key.length === 1) {
      setWorkingGrid((workingGrid) => {
        const newGrid = [...workingGrid];
        newGrid[r * size + c] = "";
        return newGrid;
      });
    }
    switch (e.key) {
      case "Backspace":
        setWorkingGrid((workingGrid) => {
          const newGrid = [...workingGrid];
          newGrid[r * size + c] = "";
          return newGrid;
        });
        if (
          direction.current == "none" &&
          (workingGrid[r * size + c - 1] != "0" ||
            workingGrid[r * size + c - size] != "0")
        ) {
          if (
            workingGrid[r * size + c - size] == "0" &&
            workingGrid[r * size + c + size] == "0"
          ) {
            direction.current = "left";
          } else if (
            workingGrid[r * size + c - 1] == "0" &&
            workingGrid[r * size + c + 1] == "0"
          ) {
            direction.current = "up";
          } else {
            direction.current = "left";
          }
        }

        if (direction.current === "left") {
          newC = Math.max(0, c - 1);
          if (workingGrid[r * size + newC] === "0") {
            direction.current = "none";
          }
        } else if (direction.current == "up") {
          newR = Math.max(0, r - 1);
          if (workingGrid[newR * size + c] == "0") {
            direction.current = "none";
          }
        }
        break;
      case "ArrowUp":
        newR = Math.max(0, r - 1);
        direction.current = "none";
        break;
      case "ArrowDown":
        newR = Math.min(size - 1, r + 1);
        direction.current = "none";
        break;
      case "ArrowLeft":
        newC = Math.max(0, c - 1);
        direction.current = "none";
        break;
      case "ArrowRight":
        newC = Math.min(size - 1, c + 1);
        direction.current = "none";
        break;
      default:
        return;
    }

    const newIndex = newR * size + newC;
    if (sourceRows[newR][newC] !== "0") {
      inputRefs.current[newIndex]?.focus();
    }
    e.preventDefault();
  };

  const handleChange = (r: number, c: number, value: string) => {
    const indx = r * size + c;
    const letter = value.toUpperCase().slice(0, 1);
    if (letter.match(/[A-Z]/)) {
      setWorkingGrid((workingGrid) => {
        const newGrid = [...workingGrid];
        newGrid[indx] = letter;
        return newGrid;
      });
      let nextInput = null;

      if (
        direction.current == "none" &&
        (workingGrid[r * size + c + 1] != "0" ||
          workingGrid[r * size + c + size] != "0")
      ) {
        if (workingGrid[r * size + c + size] == "0") {
          direction.current = "left";
        } else if (workingGrid[r * size + c + 1] == "0") {
          direction.current = "up";
        } else {
          direction.current = "left";
        }
      }

      if (direction.current === "left") {
        nextInput = inputRefs.current[r * size + c + 1];
      } else if (direction.current == "up") {
        nextInput = inputRefs.current[r * size + c + size];
      }

      nextInput?.focus();

      if ((nextInput = undefined)) {
        direction.current = "none";
      }
    }
  };

  const validateGrid = () => {
    if (!puzzle.answerGrid) return false;
    for (let i = 0; i < workingGrid.length; i++) {
      if (workingGrid[i].toLowerCase() != answerGrid[i].toLowerCase())
        return false;
    }
    return true;
  };

  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const checkAnswer = () => {
    const result = validateGrid();
    setIsCorrect(result);

    // Auto‑reset after 1 second
    setTimeout(() => {
      setIsCorrect(null);
    }, 1000);
  };

  return (
    <div className="outerbackgroundcrossword">
      <div className="innerbackgroundcrossword">
        {/* Top bar */}
        <div className="crossword-topbar">
          <button
            className={`crossword-check-btn ${
              isCorrect === true
                ? "correct"
                : isCorrect === false
                  ? "incorrect"
                  : ""
            }`}
            onClick={checkAnswer}
          >
            Check Answer
          </button>

          <h1 className="crossword-title">CROSSWORD</h1>
          <Link to="/" className="return-home">
            Home
          </Link>
        </div>

        {/* {isCorrect !== null && (
          <p className="crossword-result">{isCorrect ? "Correct!" : "Not quite it!"}</p>
        )} */}

        {/* Main content */}
        <div className="crossword-layout">
          {/* Grid */}
          <div className="grid">
            {rows.map((row, r) => (
              <div key={r} className="row">
                {row.map((cell, c) => {
                  const sourceCell = sourceRows[r][c];
                  const isBlocked = sourceCell === "0";
                  const clueNum = numberedCells[r * size + c];
                  return (
                    <div
                      key={c}
                      className={`cell ${isBlocked ? "blocked" : ""}`}
                    >
                      {clueNum && (
                        <span className="cell-number">{clueNum}</span>
                      )}
                      {!isBlocked && (
                        <input
                          ref={(el) => {
                            inputRefs.current[r * size + c] = el;
                          }}
                          maxLength={1}
                          value={typeof cell === "string" ? cell : ""}
                          onChange={(e) => handleChange(r, c, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(r, c, e)}
                          onClick={() => {
                            direction.current = "none";
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Clues */}
          <div className="clues">
            <div className="clue-column">
              <h2 className="clue-title">ACROSS</h2>
              {puzzle.hints.across.map((h) => (
                <li key={h.number}>
                  {h.number} {h.clue}
                </li>
              ))}
            </div>
            <div className="clue-column">
              <h2 className="clue-title">DOWN</h2>
              {puzzle.hints.down.map((h) => (
                <li key={h.number}>
                  {h.number} {h.clue}
                </li>
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="footer">
        Made by{" "}
        <a href="https://docs.nouse.co.uk/pages/15%20tech-team.html">
          Nouse Tech
        </a>
      </p>
    </div>
  );
}
