export const GAME_CONSTANTS = {
  MIN_NUMBER: 1,
  MAX_NUMBER: 90,
  TOTAL_NUMBERS: 90,
  DEFAULT_AUTO_CALL_INTERVAL: 5, // seconds
  MIN_AUTO_CALL_INTERVAL: 2,
  MAX_AUTO_CALL_INTERVAL: 30,
  DEFAULT_PRICE_PER_SHEET: 10000, // VND
  DEFAULT_MAX_PLAYERS: 20,
  ROOM_CODE_LENGTH: 6,
  MAX_SHEETS_PER_PLAYER: 20, // Can buy all if they want
};

/**
 * Column ranges for ticket numbers.
 * Column 0: 1-9, Column 1: 10-19, ..., Column 8: 80-90
 */
export const COLUMN_RANGES: [number, number][] = [
  [1, 9],
  [10, 19],
  [20, 29],
  [30, 39],
  [40, 49],
  [50, 59],
  [60, 69],
  [70, 79],
  [80, 90],
];
