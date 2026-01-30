"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NUMBERS_PER_ROW = exports.COLS_PER_TICKET = exports.ROWS_PER_TICKET = exports.NUMBERS_RANGE = exports.TICKETS_PER_SHEET = exports.TOTAL_TICKETS = exports.TOTAL_SHEETS = exports.SHEET_TO_TICKETS = void 0;
exports.getSheetForTicket = getSheetForTicket;
exports.SHEET_TO_TICKETS = {
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
exports.TOTAL_SHEETS = 16;
exports.TOTAL_TICKETS = 48;
exports.TICKETS_PER_SHEET = 3;
exports.NUMBERS_RANGE = { min: 1, max: 90 };
exports.ROWS_PER_TICKET = 3;
exports.COLS_PER_TICKET = 9;
exports.NUMBERS_PER_ROW = 5;
function getSheetForTicket(ticketNumber) {
    return Math.ceil(ticketNumber / exports.TICKETS_PER_SHEET);
}
//# sourceMappingURL=sheet-mapping.js.map