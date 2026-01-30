export declare const SHEET_TO_TICKETS: Record<number, [number, number, number]>;
export declare const TOTAL_SHEETS = 16;
export declare const TOTAL_TICKETS = 48;
export declare const TICKETS_PER_SHEET = 3;
export declare const NUMBERS_RANGE: {
    min: number;
    max: number;
};
export declare const ROWS_PER_TICKET = 3;
export declare const COLS_PER_TICKET = 9;
export declare const NUMBERS_PER_ROW = 5;
export declare function getSheetForTicket(ticketNumber: number): number;
