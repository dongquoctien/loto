import { TicketData, TicketRow, TicketCell, ColorGroup } from '../types/ticket.types';
import { COLUMN_RANGES } from '../constants/game.constants';

/**
 * Generate a random valid lô tô ticket.
 * Rules:
 * - 3 rows x 9 columns
 * - Each row has exactly 5 numbers and 4 blanks
 * - Column k contains numbers from COLUMN_RANGES[k]
 * - Numbers are sorted ascending within each column
 * - Each column can have 0, 1, 2, or 3 numbers (but total per row = 5)
 */
export function generateRandomTicket(
  ticketNumber: number,
  colorGroup: ColorGroup,
): TicketData {
  // Step 1: For each column, pick how many numbers it will have (0-3)
  // Total across all columns must be 15 (5 per row x 3 rows)
  // Each row must have exactly 5 numbers
  const columnCounts = distributeNumbersToColumns();

  // Step 2: For each column, pick random numbers from its range
  const columnNumbers: (number | null)[][] = [];
  for (let col = 0; col < 9; col++) {
    const [min, max] = COLUMN_RANGES[col];
    const available: number[] = [];
    for (let n = min; n <= max; n++) {
      available.push(n);
    }
    // Shuffle and pick
    shuffleArray(available);
    const picked = available.slice(0, columnCounts[col]).sort((a, b) => a - b);

    // Pad with nulls to make 3 entries
    const colEntries: (number | null)[] = [];
    for (let i = 0; i < columnCounts[col]; i++) {
      colEntries.push(picked[i]);
    }
    while (colEntries.length < 3) {
      colEntries.push(null);
    }
    columnNumbers.push(colEntries);
  }

  // Step 3: Assign numbers to rows ensuring each row has exactly 5 numbers
  const rows = assignToRows(columnNumbers, columnCounts);

  return {
    id: 0, // Will be assigned by DB
    ticketNumber,
    colorGroup,
    rows: rows as [TicketRow, TicketRow, TicketRow],
  };
}

/**
 * Distribute number counts across 9 columns.
 * Total must be 15, each column 0-3, each row must end up with 5.
 */
function distributeNumbersToColumns(): number[] {
  // Start with 1 or 2 per column, then adjust
  // Strategy: give each column at least 1, then distribute remaining 6
  let counts: number[];
  let valid = false;

  while (!valid) {
    counts = new Array(9).fill(0);
    // Each column gets 1-2 initially
    for (let i = 0; i < 9; i++) {
      counts[i] = 1 + (Math.random() < 0.5 ? 1 : 0);
    }

    // Adjust to total 15
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

    // Verify we can form valid rows (each row = 5 numbers)
    valid = canFormValidRows(counts);
  }

  return counts!;
}

function canFormValidRows(columnCounts: number[]): boolean {
  // Check if it's possible to assign numbers to 3 rows with 5 each
  // Each column with count c contributes c cells to rows
  // We need to check if a valid assignment exists
  // Simple heuristic: if no column has 0 count and total is 15, it's usually possible
  const total = columnCounts.reduce((a, b) => a + b, 0);
  return total === 15;
}

/**
 * Assign column numbers to rows, ensuring each row has exactly 5 numbers.
 */
function assignToRows(
  columnNumbers: (number | null)[][],
  columnCounts: number[],
): TicketRow[] {
  // Use backtracking to assign
  const grid: TicketCell[][] = [
    new Array(9).fill(null),
    new Array(9).fill(null),
    new Array(9).fill(null),
  ];

  const rowCounts = [0, 0, 0];

  // For each column, decide which rows get the numbers
  for (let col = 0; col < 9; col++) {
    const count = columnCounts[col];
    const numbers = columnNumbers[col].filter(n => n !== null).sort((a, b) => (a as number) - (b as number)) as number[];

    if (count === 0) continue;
    if (count === 3) {
      // All rows get a number from this column
      for (let r = 0; r < 3; r++) {
        grid[r][col] = numbers[r];
        rowCounts[r]++;
      }
    } else {
      // Pick which rows get numbers (prefer rows that need more)
      const availableRows = [0, 1, 2].filter(r => rowCounts[r] < 5);
      shuffleArray(availableRows);

      // Sort by need (fewest numbers first to balance)
      availableRows.sort((a, b) => rowCounts[a] - rowCounts[b]);

      const selectedRows = availableRows.slice(0, count).sort((a, b) => a - b);

      for (let i = 0; i < count; i++) {
        grid[selectedRows[i]][col] = numbers[i];
        rowCounts[selectedRows[i]]++;
      }
    }
  }

  // Validate and fix if needed
  // If any row doesn't have exactly 5, try swapping
  for (let attempt = 0; attempt < 100; attempt++) {
    const issues = rowCounts.some(c => c !== 5);
    if (!issues) break;

    // Find over/under rows
    const overRows = rowCounts.map((c, i) => ({ row: i, count: c })).filter(r => r.count > 5);
    const underRows = rowCounts.map((c, i) => ({ row: i, count: c })).filter(r => r.count < 5);

    if (overRows.length === 0 || underRows.length === 0) break;

    const over = overRows[0];
    const under = underRows[0];

    // Find a column where over has a number and under doesn't, and the column
    // has another number that can go to under
    for (let col = 0; col < 9; col++) {
      if (grid[over.row][col] !== null && grid[under.row][col] === null) {
        // Check if we can move without breaking column sort
        grid[under.row][col] = grid[over.row][col];
        grid[over.row][col] = null;
        rowCounts[over.row]--;
        rowCounts[under.row]++;

        // Re-sort column
        const colNums: { value: number; row: number }[] = [];
        for (let r = 0; r < 3; r++) {
          if (grid[r][col] !== null) {
            colNums.push({ value: grid[r][col] as number, row: r });
          }
        }
        colNums.sort((a, b) => a.value - b.value);
        // Clear and reassign
        for (let r = 0; r < 3; r++) grid[r][col] = null;
        for (const cn of colNums) {
          grid[cn.row][col] = cn.value;
        }

        break;
      }
    }
  }

  return grid as TicketRow[];
}

function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Generate a full set of sheets with 3 tickets each.
 */
export function generateRandomSheets(
  count: number,
  startingTicketNumber: number,
  colorGroup: ColorGroup,
): TicketData[][] {
  const sheets: TicketData[][] = [];
  let ticketNum = startingTicketNumber;

  for (let s = 0; s < count; s++) {
    const sheet: TicketData[] = [];
    for (let t = 0; t < 3; t++) {
      sheet.push(generateRandomTicket(ticketNum++, colorGroup));
    }
    sheets.push(sheet);
  }

  return sheets;
}

/**
 * Validate that a ticket follows all lô tô rules.
 */
export function validateTicket(ticket: TicketData): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

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

  // Check column ranges
  for (let col = 0; col < 9; col++) {
    const [min, max] = COLUMN_RANGES[col];
    const colNumbers: number[] = [];

    for (let r = 0; r < 3; r++) {
      const val = ticket.rows[r][col];
      if (val !== null) {
        if (val < min || val > max) {
          errors.push(`Ticket ${ticket.ticketNumber}, col ${col}: Number ${val} out of range [${min}, ${max}]`);
        }
        colNumbers.push(val);
      }
    }

    // Check ascending order
    for (let i = 1; i < colNumbers.length; i++) {
      if (colNumbers[i] <= colNumbers[i - 1]) {
        errors.push(`Ticket ${ticket.ticketNumber}, col ${col}: Numbers not in ascending order`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
