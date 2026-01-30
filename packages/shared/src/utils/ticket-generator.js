"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomTicket = generateRandomTicket;
exports.generateRandomSheets = generateRandomSheets;
exports.validateTicket = validateTicket;
const game_constants_1 = require("../constants/game.constants");
function generateRandomTicket(ticketNumber, colorGroup) {
    const columnCounts = distributeNumbersToColumns();
    const columnNumbers = [];
    for (let col = 0; col < 9; col++) {
        const [min, max] = game_constants_1.COLUMN_RANGES[col];
        const available = [];
        for (let n = min; n <= max; n++) {
            available.push(n);
        }
        shuffleArray(available);
        const picked = available.slice(0, columnCounts[col]).sort((a, b) => a - b);
        const colEntries = [];
        for (let i = 0; i < columnCounts[col]; i++) {
            colEntries.push(picked[i]);
        }
        while (colEntries.length < 3) {
            colEntries.push(null);
        }
        columnNumbers.push(colEntries);
    }
    const rows = assignToRows(columnNumbers, columnCounts);
    return {
        id: 0,
        ticketNumber,
        colorGroup,
        rows: rows,
    };
}
function distributeNumbersToColumns() {
    let counts;
    let valid = false;
    while (!valid) {
        counts = new Array(9).fill(0);
        for (let i = 0; i < 9; i++) {
            counts[i] = 1 + (Math.random() < 0.5 ? 1 : 0);
        }
        let total = counts.reduce((a, b) => a + b, 0);
        while (total < 15) {
            const col = Math.floor(Math.random() * 9);
            if (counts[col] < 3) {
                counts[col]++;
                total++;
            }
        }
        while (total > 15) {
            const col = Math.floor(Math.random() * 9);
            if (counts[col] > 0) {
                counts[col]--;
                total--;
            }
        }
        valid = canFormValidRows(counts);
    }
    return counts;
}
function canFormValidRows(columnCounts) {
    const total = columnCounts.reduce((a, b) => a + b, 0);
    return total === 15;
}
function assignToRows(columnNumbers, columnCounts) {
    const grid = [
        new Array(9).fill(null),
        new Array(9).fill(null),
        new Array(9).fill(null),
    ];
    const rowCounts = [0, 0, 0];
    for (let col = 0; col < 9; col++) {
        const count = columnCounts[col];
        const numbers = columnNumbers[col].filter(n => n !== null).sort((a, b) => a - b);
        if (count === 0)
            continue;
        if (count === 3) {
            for (let r = 0; r < 3; r++) {
                grid[r][col] = numbers[r];
                rowCounts[r]++;
            }
        }
        else {
            const availableRows = [0, 1, 2].filter(r => rowCounts[r] < 5);
            shuffleArray(availableRows);
            availableRows.sort((a, b) => rowCounts[a] - rowCounts[b]);
            const selectedRows = availableRows.slice(0, count).sort((a, b) => a - b);
            for (let i = 0; i < count; i++) {
                grid[selectedRows[i]][col] = numbers[i];
                rowCounts[selectedRows[i]]++;
            }
        }
    }
    for (let attempt = 0; attempt < 100; attempt++) {
        const issues = rowCounts.some(c => c !== 5);
        if (!issues)
            break;
        const overRows = rowCounts.map((c, i) => ({ row: i, count: c })).filter(r => r.count > 5);
        const underRows = rowCounts.map((c, i) => ({ row: i, count: c })).filter(r => r.count < 5);
        if (overRows.length === 0 || underRows.length === 0)
            break;
        const over = overRows[0];
        const under = underRows[0];
        for (let col = 0; col < 9; col++) {
            if (grid[over.row][col] !== null && grid[under.row][col] === null) {
                grid[under.row][col] = grid[over.row][col];
                grid[over.row][col] = null;
                rowCounts[over.row]--;
                rowCounts[under.row]++;
                const colNums = [];
                for (let r = 0; r < 3; r++) {
                    if (grid[r][col] !== null) {
                        colNums.push({ value: grid[r][col], row: r });
                    }
                }
                colNums.sort((a, b) => a.value - b.value);
                for (let r = 0; r < 3; r++)
                    grid[r][col] = null;
                for (const cn of colNums) {
                    grid[cn.row][col] = cn.value;
                }
                break;
            }
        }
    }
    return grid;
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function generateRandomSheets(count, startingTicketNumber, colorGroup) {
    const sheets = [];
    let ticketNum = startingTicketNumber;
    for (let s = 0; s < count; s++) {
        const sheet = [];
        for (let t = 0; t < 3; t++) {
            sheet.push(generateRandomTicket(ticketNum++, colorGroup));
        }
        sheets.push(sheet);
    }
    return sheets;
}
function validateTicket(ticket) {
    const errors = [];
    if (ticket.rows.length !== 3) {
        errors.push(`Ticket ${ticket.ticketNumber}: Must have exactly 3 rows`);
        return { valid: false, errors };
    }
    for (let r = 0; r < 3; r++) {
        const row = ticket.rows[r];
        if (row.length !== 9) {
            errors.push(`Ticket ${ticket.ticketNumber}, row ${r}: Must have exactly 9 columns`);
            continue;
        }
        const numbersInRow = row.filter(cell => cell !== null);
        if (numbersInRow.length !== 5) {
            errors.push(`Ticket ${ticket.ticketNumber}, row ${r}: Must have exactly 5 numbers, has ${numbersInRow.length}`);
        }
    }
    for (let col = 0; col < 9; col++) {
        const [min, max] = game_constants_1.COLUMN_RANGES[col];
        const colNumbers = [];
        for (let r = 0; r < 3; r++) {
            const val = ticket.rows[r][col];
            if (val !== null) {
                if (val < min || val > max) {
                    errors.push(`Ticket ${ticket.ticketNumber}, col ${col}: Number ${val} out of range [${min}, ${max}]`);
                }
                colNumbers.push(val);
            }
        }
        for (let i = 1; i < colNumbers.length; i++) {
            if (colNumbers[i] <= colNumbers[i - 1]) {
                errors.push(`Ticket ${ticket.ticketNumber}, col ${col}: Numbers not in ascending order`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
//# sourceMappingURL=ticket-generator.js.map