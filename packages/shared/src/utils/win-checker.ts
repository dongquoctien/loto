import { TicketData, WinType, LineDetails } from '../types/ticket.types';

/**
 * Check if a horizontal line (row) is complete.
 * A row wins when all 5 numbers in that row have been called.
 */
export function checkHorizontalWin(
  ticket: TicketData,
  calledNumbers: Set<number>,
): { won: boolean; rowIndex: number } {
  for (let r = 0; r < 3; r++) {
    const row = ticket.rows[r];
    const numbersInRow = row.filter(cell => cell !== null) as number[];
    if (numbersInRow.length === 0) continue;

    const allCalled = numbersInRow.every(n => calledNumbers.has(n));
    if (allCalled) {
      return { won: true, rowIndex: r };
    }
  }
  return { won: false, rowIndex: -1 };
}

/**
 * Check if a vertical line (column) is complete.
 * A column wins when ALL numbers in that column have been called.
 * Columns with 0 numbers cannot win.
 */
export function checkVerticalWin(
  ticket: TicketData,
  calledNumbers: Set<number>,
): { won: boolean; colIndex: number } {
  for (let c = 0; c < 9; c++) {
    const numbersInCol: number[] = [];
    for (let r = 0; r < 3; r++) {
      const val = ticket.rows[r][c];
      if (val !== null) {
        numbersInCol.push(val);
      }
    }

    // Must have at least 1 number to win a column
    if (numbersInCol.length === 0) continue;

    const allCalled = numbersInCol.every(n => calledNumbers.has(n));
    if (allCalled) {
      return { won: true, colIndex: c };
    }
  }
  return { won: false, colIndex: -1 };
}

/**
 * Check if a diagonal line is complete.
 * On a 3x9 grid, diagonals span 3 rows across 3 consecutive columns.
 * Main diagonal: (0, startCol), (1, startCol+1), (2, startCol+2)
 * Anti diagonal: (0, startCol), (1, startCol-1), (2, startCol-2)
 * All 3 cells must contain numbers and all must be called.
 */
export function checkDiagonalWin(
  ticket: TicketData,
  calledNumbers: Set<number>,
): { won: boolean; direction: 'main' | 'anti'; startCol: number } {
  // Main diagonals: startCol from 0 to 6 (need 3 consecutive cols)
  for (let startCol = 0; startCol <= 6; startCol++) {
    const cells = [
      ticket.rows[0][startCol],
      ticket.rows[1][startCol + 1],
      ticket.rows[2][startCol + 2],
    ];

    // All 3 cells must have numbers
    if (cells.every(c => c !== null)) {
      const numbers = cells as number[];
      if (numbers.every(n => calledNumbers.has(n))) {
        return { won: true, direction: 'main', startCol };
      }
    }
  }

  // Anti diagonals: startCol from 2 to 8
  for (let startCol = 2; startCol <= 8; startCol++) {
    const cells = [
      ticket.rows[0][startCol],
      ticket.rows[1][startCol - 1],
      ticket.rows[2][startCol - 2],
    ];

    if (cells.every(c => c !== null)) {
      const numbers = cells as number[];
      if (numbers.every(n => calledNumbers.has(n))) {
        return { won: true, direction: 'anti', startCol };
      }
    }
  }

  return { won: false, direction: 'main', startCol: -1 };
}

/**
 * Validate a specific win claim.
 */
export function validateWinClaim(
  ticket: TicketData,
  calledNumbers: Set<number>,
  winType: WinType,
  lineDetails: LineDetails,
): { valid: boolean; reason: string } {
  switch (winType) {
    case 'horizontal': {
      if (lineDetails.rowIndex === undefined || lineDetails.rowIndex < 0 || lineDetails.rowIndex > 2) {
        return { valid: false, reason: 'Invalid row index' };
      }
      const row = ticket.rows[lineDetails.rowIndex];
      const numbersInRow = row.filter(c => c !== null) as number[];
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
      const numbersInCol: number[] = [];
      for (let r = 0; r < 3; r++) {
        const val = ticket.rows[r][lineDetails.colIndex];
        if (val !== null) numbersInCol.push(val);
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

      let cells: (number | null)[];
      if (lineDetails.direction === 'main') {
        if (lineDetails.startCol < 0 || lineDetails.startCol > 6) {
          return { valid: false, reason: 'Invalid start column for main diagonal' };
        }
        cells = [
          ticket.rows[0][lineDetails.startCol],
          ticket.rows[1][lineDetails.startCol + 1],
          ticket.rows[2][lineDetails.startCol + 2],
        ];
      } else {
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

      const numbers = cells as number[];
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

/**
 * Check all possible wins for a ticket given the enabled win types.
 */
export function checkAllWins(
  ticket: TicketData,
  calledNumbers: Set<number>,
  enabledWinTypes: { horizontal: boolean; vertical: boolean; diagonal: boolean },
): { hasWin: boolean; wins: { winType: WinType; lineDetails: LineDetails }[] } {
  const wins: { winType: WinType; lineDetails: LineDetails }[] = [];

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
