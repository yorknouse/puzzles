export interface CrosswordPuzzle {
    title: string;
    size: number;
    workingGrid: string[];
    answerGrid: string[];
    hints: Hints;
}

export interface ClueEntry {
    number: number;
    clue: string;
    word: string;
}

export interface Hints {
    across: ClueEntry[];
    down: ClueEntry[];
}