"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkHorizontalWin = checkHorizontalWin;
exports.checkVerticalWin = checkVerticalWin;
exports.checkDiagonalWin = checkDiagonalWin;
exports.validateWinClaim = validateWinClaim;
exports.checkAllWins = checkAllWins;
function checkHorizontalWin(ticket, calledNumbers) {
    for (let r = 0; r < 3; r++) {
        const row = ticket.rows[r];
        const numbersInRow = row.filter(cell => cell !== null);
        if (numbersInRow.length === 0)
            continue;
        const allCalled = numbersInRow.every(n => calledNumbers.has(n));
        if (allCalled) {
            return { won: true, rowIndex: r };
        }
    }
    return { won: false, rowIndex: -1 };
}
function checkVerticalWin(ticket, calledNumbers) {
    for (let c = 0; c < 9; c++) {
        const numbersInCol = [];
        for (let r = 0; r < 3; r++) {
            const val = ticket.rows[r][c];
            if (val !== null) {
                numbersInCol.push(val);
            }
        }
        if (numbersInCol.length === 0)
            continue;
        const allCalled = numbersInCol.every(n => calledNumbers.has(n));
        if (allCalled) {
            return { won: true, colIndex: c };
        }
    }
    return { won: false, colIndex: -1 };
}
function checkDiagonalWin(ticket, calledNumbers) {
    for (let startCol = 0; startCol <= 6; startCol++) {
        const cells = [
            ticket.rows[0][startCol],
            ticket.rows[1][startCol + 1],
            ticket.rows[2][startCol + 2],
        ];
        if (cells.every(c => c !== null)) {
            const numbers = cells;
            if (numbers.every(n => calledNumbers.has(n))) {
                return { won: true, direction: 'main', startCol };
            }
        }
    }
    for (let startCol = 2; startCol <= 8; startCol++) {
        const cells = [
            ticket.rows[0][startCol],
            ticket.rows[1][startCol - 1],
            ticket.rows[2][startCol - 2],
        ];
        if (cells.every(c => c !== null)) {
            const numbers = cells;
            if (numbers.every(n => calledNumbers.has(n))) {
                return { won: true, direction: 'anti', startCol };
            }
        }
    }
    return { won: false, direction: 'main', startCol: -1 };
}
function validateWinClaim(ticket, calledNumbers, winType, lineDetails) {
    switch (winType) {
        case 'horizontal': {
            if (lineDetails.rowIndex === undefined || lineDetails.rowIndex < 0 || lineDetails.rowIndex > 2) {
                return { valid: false, reason: 'Invalid row index' };
            }
            const row = ticket.rows[lineDetails.rowIndex];
            const numbersInRow = row.filter(c => c !== null);
            if (numbersInRow.length === 0) {
                return { valid: false, reason: 'Row has no numbers' };
            }
            const allCalled = numbersInRow.every(n => calledNumbers.has(n));
            return {
                valid: allCalled,
                reason: allCalled ? '' : 'Not all numbers in the row have been called',
            };
        }
        case 'vertical': {
            if (lineDetails.colIndex === undefined || lineDetails.colIndex < 0 || lineDetails.colIndex > 8) {
                return { valid: false, reason: 'Invalid column index' };
            }
            const numbersInCol = [];
            for (let r = 0; r < 3; r++) {
                const val = ticket.rows[r][lineDetails.colIndex];
                if (val !== null)
                    numbersInCol.push(val);
            }
            if (numbersInCol.length === 0) {
                return { valid: false, reason: 'Column has no numbers' };
            }
            const allCalled = numbersInCol.every(n => calledNumbers.has(n));
            return {
                valid: allCalled,
                reason: allCalled ? '' : 'Not all numbers in the column have been called',
            };
        }
        case 'diagonal': {
            if (!lineDetails.direction || lineDetails.startCol === undefined) {
                return { valid: false, reason: 'Invalid diagonal details' };
            }
            let cells;
            if (lineDetails.direction === 'main') {
                if (lineDetails.startCol < 0 || lineDetails.startCol > 6) {
                    return { valid: false, reason: 'Invalid start column for main diagonal' };
                }
                cells = [
                    ticket.rows[0][lineDetails.startCol],
                    ticket.rows[1][lineDetails.startCol + 1],
                    ticket.rows[2][lineDetails.startCol + 2],
                ];
            }
            else {
                if (lineDetails.startCol < 2 || lineDetails.startCol > 8) {
                    return { valid: false, reason: 'Invalid start column for anti diagonal' };
                }
                cells = [
                    ticket.rows[0][lineDetails.startCol],
                    ticket.rows[1][lineDetails.startCol - 1],
                    ticket.rows[2][lineDetails.startCol - 2],
                ];
            }
            if (cells.some(c => c === null)) {
                return { valid: false, reason: 'Diagonal contains blank cells' };
            }
            const numbers = cells;
            const allCalled = numbers.every(n => calledNumbers.has(n));
            return {
                valid: allCalled,
                reason: allCalled ? '' : 'Not all numbers on the diagonal have been called',
            };
        }
        default:
            return { valid: false, reason: 'Unknown win type' };
    }
}
function checkAllWins(ticket, calledNumbers, enabledWinTypes) {
    const wins = [];
    if (enabledWinTypes.horizontal) {
        const result = checkHorizontalWin(ticket, calledNumbers);
        if (result.won) {
            wins.push({ winType: 'horizontal', lineDetails: { rowIndex: result.rowIndex } });
        }
    }
    if (enabledWinTypes.vertical) {
        const result = checkVerticalWin(ticket, calledNumbers);
        if (result.won) {
            wins.push({ winType: 'vertical', lineDetails: { colIndex: result.colIndex } });
        }
    }
    if (enabledWinTypes.diagonal) {
        const result = checkDiagonalWin(ticket, calledNumbers);
        if (result.won) {
            wins.push({
                winType: 'diagonal',
                lineDetails: { direction: result.direction, startCol: result.startCol },
            });
        }
    }
    return { hasWin: wins.length > 0, wins };
}
//# sourceMappingURL=win-checker.js.map