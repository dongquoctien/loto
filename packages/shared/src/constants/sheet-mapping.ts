/**
 * Maps sheet number to its 3 ticket numbers.
 * Sheet 1 contains tickets [1, 2, 3], etc.
 * Each image file (e.g., 1-2-3.jpg) corresponds to one sheet.
 */
export const SHEET_TO_TICKETS: Record<number, [number, number, number]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
  5: [13, 14, 15],
  6: [16, 17, 18],
  7: [19, 20, 21],
  8: [22, 23, 24],
  9: [25, 26, 27],
  10: [28, 29, 30],
  11: [31, 32, 33],
  12: [34, 35, 36],
  13: [37, 38, 39],
  14: [40, 41, 42],
  15: [43, 44, 45],
  16: [46, 47, 48],
};

export const TOTAL_SHEETS = 16;
export const TOTAL_TICKETS = 48;
export const TICKETS_PER_SHEET = 3;
export const NUMBERS_RANGE = { min: 1, max: 90 };
export const ROWS_PER_TICKET = 3;
export const COLS_PER_TICKET = 9;
export const NUMBERS_PER_ROW = 5;

/**
 * Get the sheet number that contains a given ticket number.
 */
export function getSheetForTicket(ticketNumber: number): number {
  return Math.ceil(ticketNumber / TICKETS_PER_SHEET);
}
