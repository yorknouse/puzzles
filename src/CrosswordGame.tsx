import { useState, useRef } from 'react';
import type { CrosswordPuzzle} from './crossword';
import puzzle1 from './Crosswords/puzzle1.json';

type Props = {
    puzzle?: CrosswordPuzzle;  // pass a puzzle as a prop to be used, otherwise deafulting to puzzle1
};

export default function CrosswordGame({ puzzle = puzzle1 }: Props) { //renders the crossword

    const size = puzzle.size

    const inputRefs = useRef<(HTMLInputElement | null)[]>([]); //navigate between cells using arrrow keys

    // Convert flat grid to 2D array for rendering
    const sourceGrid = puzzle.workingGrid; // I think we should only pre-defined answer grid, and build working grid using it. Will update later
    const [workingGrid, setWorkingGrid] = useState<(string)[]>(() => 
        sourceGrid.map(cell => (cell === '0' ? '0' : ''))
    );

    const answerGrid = puzzle.answerGrid;
    const rows: (string)[][] = [];
    const sourceRows: (string)[][] = [];
    
    for (let r = 0; r < size; r++) {
        rows.push(workingGrid.slice(r * size, r * size + size));
        sourceRows.push(sourceGrid.slice(r * size, r * size + size));
    }

    const numberedCells: { [index: number]: number } = {};
    let nextNumberA = 1;
    let nextNumberD = 2;

    const isStartOfAcross = (r: number, c: number) => {
        const value = answerGrid[r * size + c];
        if (value === '0'){ //base case
            return false;
        }
        if (value.toUpperCase() === value) {
            if ((c == 0) || (sourceRows[r][c - 1] === '0') && (sourceRows[r][c + 1] !== '0')) {
                return true; // check if it's a Capital letter
            };
        };
        return false;
    };

    const isStartOfDown = (r: number, c: number) => {
        const value = answerGrid[r * size + c];
        if (value === '0') { //base case
            return false;
        }
        if (value.toUpperCase() === value){
            console.log(value);
            if ((r == 0) || (sourceRows[r - 1][c] === '0') && (sourceRows[r + 1][c] !== '0')) {
                return true; // check if it's a Capital letter
            };
        };
        return false;
    };

    //assigns numbers to correct squares
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (isStartOfAcross(r, c)) {
                numberedCells[r * size + c] = nextNumberA;
                nextNumberA += 2
            }
            else if (isStartOfDown(r, c)) {
                numberedCells[r * size + c] = nextNumberD;
                nextNumberD += 2    
            }
        }
    }

    //arrrow key moving across grid functionality 
    const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        
        let newR = r;
        let newC = c;

        switch (e.key) {
            case 'ArrowUp':
                newR = Math.max(0, r - 1);
                break;
            case 'ArrowDown':
                newR = Math.min(size - 1, r + 1);
                break;
            case 'ArrowLeft':
                newC = Math.max(0, c - 1);
                break;
            case 'ArrowRight':
                newC = Math.min(size - 1, c + 1);
                break;
            default:
                return; // exit if it's not an arrow key
        }

        const newIndex = newR * size + newC;

        // Skip blocked cells
        if (sourceRows[newR][newC] !== '0') {
            inputRefs.current[newIndex]?.focus();
        }

        e.preventDefault();
    };

    const handleChange = (r: number, c: number, value: string) => { //update the working grid when a cell value is changed
        const indx = r * size + c;
        setWorkingGrid(prev => {
            const newGrid = [...prev];
            newGrid[indx] = value; // 0 for empty cells
            return newGrid;
        })
    }

    //compare workingGrid and answerGrid
    const validateGrid = () => {
        if (!puzzle.answerGrid) return false;
        for (let i = 0; i < workingGrid.length; i++) {
                if (workingGrid[i].toLowerCase() != answerGrid[i].toLowerCase()) {
                    return false;
                }
            }
        return true; 
    };

    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const checkAnswer = () => {
        const result = validateGrid()
        setIsCorrect(result)
    }

    return (


        //HTML Section
        
        <div className="outerbackground">
            <div className="innerbackground"> 
                <div className = "title-container">
                    <h1 className="crossword-title">CROSSWORD</h1>
                    <div className="controls">
                            <button onClick={checkAnswer}>Check Answer</button>
                            {isCorrect !== null && (
                                <p>{isCorrect ? 'Correct!' : "Not quite it!"}</p>
                            )}
                        </div>
                    </div>
                <div className="crossword">
                    {/* Grid rendering */}
                    <div className="grid">
                        {rows.map((row, r) => (
                            <div key={r} className="row">
                                {row.map((cell, c) => {
                                    const sourceCell = sourceRows[r][c];
                                    const isBlocked = sourceCell === '0';
                                    const clueNum = numberedCells[r * size + c];
                                    return (
                                        <div key={c} className={`cell ${isBlocked ? 'blocked' : ''}`}>
                                            {clueNum && <span className="cell-number">{clueNum}</span>}
                                            {!isBlocked && (
                                                <input
                                                    ref={el => { inputRefs.current[r * size + c] = el; }}
                                                    maxLength={1}
                                                    value={typeof cell === 'string' ? cell : ''}
                                                    onChange={(e) => handleChange(r, c, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(r, c, e)}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="clues">
                        <div className ="clue-column">
                            <h2 className="clue-title">ACROSS</h2>
                            {puzzle.hints.across.map(h => (
                                <li key={h.number}>{h.number} {h.clue}</li>
                            ))}
                        </div>             
                        <div className="clue-column">
                            <h2 className="clue-title">DOWN</h2>
                            {puzzle.hints.down.map(h => (
                                <li key={h.number}>{h.number} {h.clue}</li>
                            ))}
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
        </div>
    );
    
}
