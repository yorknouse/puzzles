export interface CrosswordPuzzle {
    title: string;
    size: [number, number];
    workingGrid: (number | string)[];
    answerGrid: (number | string)[];
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

export interface Guesses {
    [cellNum: number]: string;
}

export interface ValidationResult {
    isCorrect: boolean;
    errors: string[];
}

export interface Cell {
    row: number;
    col: number;
    value: string;
    isBlocked: boolean;
    clueNumber?: number;
}