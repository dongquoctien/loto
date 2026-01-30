"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FIXED_TICKETS = void 0;
exports.getTicketByNumber = getTicketByNumber;
exports.getTicketsByColor = getTicketsByColor;
exports.FIXED_TICKETS = [
    {
        id: 1, ticketNumber: 1, colorGroup: 'orange',
        rows: [
            [3, 15, null, 32, null, null, 60, 71, null],
            [null, 10, 20, null, 43, 54, null, null, 85],
            [2, null, 26, 35, null, 59, null, 76, null],
        ],
    },
    {
        id: 2, ticketNumber: 2, colorGroup: 'orange',
        rows: [
            [6, null, null, 39, 49, null, 68, 73, null],
            [null, 13, 29, null, 48, 50, null, null, 88],
            [null, null, 22, 30, null, 53, 65, null, 82],
        ],
    },
    {
        id: 3, ticketNumber: 3, colorGroup: 'orange',
        rows: [
            [1, null, 25, null, null, 58, 69, null, 90],
            [7, null, 21, null, 41, 56, null, null, 87],
            [null, 11, null, 37, 44, null, 61, 70, null],
        ],
    },
    {
        id: 4, ticketNumber: 4, colorGroup: 'orange',
        rows: [
            [null, 12, null, 34, 40, null, null, 75, 89],
            [8, 16, null, null, 42, 55, null, 77, null],
            [5, null, 24, 33, null, null, 67, null, 83],
        ],
    },
    {
        id: 5, ticketNumber: 5, colorGroup: 'orange',
        rows: [
            [null, 14, 27, null, null, 51, null, 78, 84],
            [null, 18, null, 38, 46, null, 63, null, 81],
            [9, null, null, null, 47, null, 66, 79, 86],
        ],
    },
    {
        id: 6, ticketNumber: 6, colorGroup: 'orange',
        rows: [
            [4, null, 28, 31, null, 57, null, 72, null],
            [null, 17, null, 36, null, 52, 64, null, 80],
            [null, 19, 23, null, 45, null, 62, 74, null],
        ],
    },
    {
        id: 7, ticketNumber: 7, colorGroup: 'yellow',
        rows: [
            [7, 16, null, 32, null, null, 66, 73, null],
            [null, 18, 29, null, 46, 55, null, null, 88],
            [2, null, 23, 34, null, 50, null, 75, null],
        ],
    },
    {
        id: 8, ticketNumber: 8, colorGroup: 'yellow',
        rows: [
            [4, null, null, 30, 40, null, 61, 78, null],
            [null, 10, 27, null, 41, 56, null, null, 86],
            [null, null, 20, 39, null, 59, 60, null, 83],
        ],
    },
    {
        id: 9, ticketNumber: 9, colorGroup: 'yellow',
        rows: [
            [9, null, 24, null, null, 51, 64, null, 81],
            [3, null, 28, null, 48, 53, null, null, 80],
            [null, 17, null, 37, 45, null, 63, 77, null],
        ],
    },
    {
        id: 10, ticketNumber: 10, colorGroup: 'yellow',
        rows: [
            [null, 19, null, 35, 49, null, null, 71, 85],
            [8, 14, null, null, 47, 54, null, 74, null],
            [6, null, 25, 36, null, null, 62, null, 84],
        ],
    },
    {
        id: 11, ticketNumber: 11, colorGroup: 'yellow',
        rows: [
            [null, 15, 22, null, null, 58, null, 70, 89],
            [null, 12, null, 31, 43, null, 68, null, 90],
            [1, null, null, null, 42, null, 65, 72, 87],
        ],
    },
    {
        id: 12, ticketNumber: 12, colorGroup: 'yellow',
        rows: [
            [5, null, 21, 38, null, 52, null, 76, null],
            [null, 13, null, 33, null, 57, 67, null, 82],
            [null, 11, 26, null, 44, null, null, 69, 79],
        ],
    },
    {
        id: 13, ticketNumber: 13, colorGroup: 'purple',
        rows: [
            [null, 15, 24, null, 44, null, 64, 79, null],
            [4, null, 29, 30, null, 51, null, 76, null],
            [null, 17, null, 32, null, 53, 63, null, 80],
        ],
    },
    {
        id: 14, ticketNumber: 14, colorGroup: 'purple',
        rows: [
            [7, null, 23, null, null, 56, 61, null, 85],
            [null, 11, null, 34, 42, null, null, 72, 87],
            [3, 13, null, null, 45, 54, null, 74, null],
        ],
    },
    {
        id: 15, ticketNumber: 15, colorGroup: 'purple',
        rows: [
            [null, 16, 21, null, 43, 58, null, 78, null],
            [6, null, null, 37, 40, null, 65, null, 82],
            [2, null, 22, 39, null, null, 67, null, 83],
        ],
    },
    {
        id: 16, ticketNumber: 16, colorGroup: 'purple',
        rows: [
            [null, 14, 28, null, null, 50, null, 75, 90],
            [null, 19, null, 31, 49, null, 68, null, 81],
            [5, null, 20, null, 47, null, null, 77, 84],
        ],
    },
    {
        id: 17, ticketNumber: 17, colorGroup: 'purple',
        rows: [
            [null, 12, null, 38, null, 55, 69, null, 89],
            [1, null, null, 36, 41, null, 66, 71, null],
            [null, 18, 26, null, null, 57, null, 70, 88],
        ],
    },
    {
        id: 18, ticketNumber: 18, colorGroup: 'purple',
        rows: [
            [8, null, 25, 33, null, 52, 62, null, null],
            [9, null, null, 35, 46, null, 60, 73, null],
            [null, 10, 27, null, 48, 59, null, null, 86],
        ],
    },
    {
        id: 19, ticketNumber: 19, colorGroup: 'pink',
        rows: [
            [null, 19, 28, null, 46, null, 68, 75, null],
            [5, null, 26, 39, null, 58, null, 78, null],
            [null, 14, null, 37, null, 50, 69, null, 84],
        ],
    },
    {
        id: 20, ticketNumber: 20, colorGroup: 'pink',
        rows: [
            [3, null, 25, null, null, 57, 60, null, 86],
            [null, 16, null, 31, 49, null, null, 77, 89],
            [8, 17, null, null, 48, 59, null, 79, null],
        ],
    },
    {
        id: 21, ticketNumber: 21, colorGroup: 'pink',
        rows: [
            [null, 15, 20, null, 44, 52, null, 70, null],
            [4, null, null, 33, 41, null, 61, null, 83],
            [9, null, 29, 30, null, null, 62, null, 88],
        ],
    },
    {
        id: 22, ticketNumber: 22, colorGroup: 'pink',
        rows: [
            [null, 18, 22, null, null, 55, null, 76, 87],
            [null, 12, null, 38, 40, null, 66, null, 82],
            [1, null, 27, null, 42, null, null, 73, 85],
        ],
    },
    {
        id: 23, ticketNumber: 23, colorGroup: 'pink',
        rows: [
            [null, 10, null, 34, null, 56, 63, null, 80],
            [6, null, null, 35, 43, null, 64, 71, null],
            [null, 13, 21, null, null, 54, null, 74, 90],
        ],
    },
    {
        id: 24, ticketNumber: 24, colorGroup: 'pink',
        rows: [
            [7, null, 24, 32, null, 53, 67, null, null],
            [2, null, null, 36, 47, null, 65, 72, null],
            [null, 11, 23, null, 45, 51, null, null, 81],
        ],
    },
    {
        id: 25, ticketNumber: 25, colorGroup: 'blue',
        rows: [
            [null, 13, 22, null, 41, null, 61, null, 86],
            [3, null, 24, 34, null, 52, null, 71, null],
            [1, null, null, 35, null, 56, 64, null, 83],
        ],
    },
    {
        id: 26, ticketNumber: 26, colorGroup: 'blue',
        rows: [
            [7, null, 23, 36, null, 53, null, 75, null],
            [5, null, null, null, 48, 59, null, 72, 84],
            [null, 14, 28, null, 42, null, 60, null, 87],
        ],
    },
    {
        id: 27, ticketNumber: 27, colorGroup: 'blue',
        rows: [
            [null, null, 26, null, 47, 50, null, 79, 89],
            [4, 10, null, 30, 49, null, 66, null, null],
            [null, 15, 25, null, null, 51, null, 76, 81],
        ],
    },
    {
        id: 28, ticketNumber: 28, colorGroup: 'blue',
        rows: [
            [9, 16, null, null, 46, null, 65, null, 80],
            [null, 11, null, 32, 45, null, 68, 78, null],
            [8, null, 21, 33, null, 57, null, 73, null],
        ],
    },
    {
        id: 29, ticketNumber: 29, colorGroup: 'blue',
        rows: [
            [6, null, 20, null, 43, null, 63, 77, null],
            [null, 12, null, 31, null, 54, 62, null, 85],
            [null, 19, null, 39, 40, null, null, 70, 82],
        ],
    },
    {
        id: 30, ticketNumber: 30, colorGroup: 'blue',
        rows: [
            [null, 18, 29, null, null, 58, null, 74, 90],
            [null, 17, null, 38, 44, null, 69, null, 88],
            [2, null, 27, 37, null, 55, 67, null, null],
        ],
    },
    {
        id: 31, ticketNumber: 31, colorGroup: 'green',
        rows: [
            [null, 16, 28, null, 45, null, 68, null, 87],
            [4, null, 29, 35, null, 55, null, 73, null],
            [9, null, null, 30, null, 54, 62, null, 88],
        ],
    },
    {
        id: 32, ticketNumber: 32, colorGroup: 'green',
        rows: [
            [1, null, 21, 33, null, 52, null, 76, null],
            [8, null, null, null, 40, 50, null, 79, 81],
            [null, 11, 20, null, 46, null, 63, null, 83],
        ],
    },
    {
        id: 33, ticketNumber: 33, colorGroup: 'green',
        rows: [
            [null, null, 27, null, 49, 59, null, 72, 80],
            [2, 19, null, 32, 48, null, 67, null, null],
            [null, 14, 22, null, null, 57, null, 78, 90],
        ],
    },
    {
        id: 34, ticketNumber: 34, colorGroup: 'green',
        rows: [
            [6, 18, null, null, 47, null, 69, null, 86],
            [null, 13, null, 31, 44, null, 61, 70, null],
            [7, null, 24, 34, null, 56, null, 71, null],
        ],
    },
    {
        id: 35, ticketNumber: 35, colorGroup: 'green',
        rows: [
            [5, null, 23, null, 41, null, 65, 74, null],
            [null, 10, null, 37, null, 53, 60, null, 89],
            [null, 17, null, 38, 42, null, null, 75, 84],
        ],
    },
    {
        id: 36, ticketNumber: 36, colorGroup: 'green',
        rows: [
            [null, 15, 25, null, null, 51, null, 77, 85],
            [null, 12, null, 36, 43, null, 64, null, 82],
            [3, null, 26, 39, null, 58, 66, null, null],
        ],
    },
    {
        id: 37, ticketNumber: 37, colorGroup: 'lime',
        rows: [
            [9, null, 25, 38, null, 53, null, null, 86],
            [null, 15, null, 36, null, 51, 64, null, 90],
            [2, null, 28, null, 47, null, 66, 78, null],
        ],
    },
    {
        id: 38, ticketNumber: 38, colorGroup: 'lime',
        rows: [
            [5, 10, null, null, 41, 56, null, 72, null],
            [4, null, 22, 33, null, 54, null, 74, null],
            [null, 13, 26, null, 40, null, 61, null, 82],
        ],
    },
    {
        id: 39, ticketNumber: 39, colorGroup: 'lime',
        rows: [
            [null, null, 29, 30, null, 58, 62, null, 83],
            [null, null, 21, null, 43, 52, null, 75, 84],
            [6, 18, null, 32, null, null, 69, 70, null],
        ],
    },
    {
        id: 40, ticketNumber: 40, colorGroup: 'lime',
        rows: [
            [null, 11, null, 35, null, 59, 68, null, 80],
            [null, 17, 24, null, 42, 57, null, 76, null],
            [1, null, 27, null, 48, null, null, 79, 81],
        ],
    },
    {
        id: 41, ticketNumber: 41, colorGroup: 'lime',
        rows: [
            [7, 16, null, 31, null, null, 65, 77, null],
            [null, null, 23, null, 44, 50, null, 71, 85],
            [null, 14, null, 37, 49, null, 63, null, 88],
        ],
    },
    {
        id: 42, ticketNumber: 42, colorGroup: 'lime',
        rows: [
            [3, null, 20, null, 46, null, 67, 73, null],
            [8, 12, null, 34, 45, null, null, null, 87],
            [null, 19, null, 39, null, 55, 60, null, 89],
        ],
    },
    {
        id: 43, ticketNumber: 43, colorGroup: 'red',
        rows: [
            [5, null, 29, 30, null, 56, null, null, 80],
            [null, 10, null, 35, null, 54, 63, null, 81],
            [4, null, 26, null, 45, null, 61, 79, null],
        ],
    },
    {
        id: 44, ticketNumber: 44, colorGroup: 'red',
        rows: [
            [3, 14, null, null, 43, 50, null, 71, null],
            [7, null, 23, 31, null, 52, null, 73, null],
            [null, 11, 28, null, 49, null, 69, null, 89],
        ],
    },
    {
        id: 45, ticketNumber: 45, colorGroup: 'red',
        rows: [
            [null, null, 24, 34, null, 53, 67, null, 85],
            [null, null, 27, null, 40, 57, null, 76, 87],
            [1, 16, null, 33, null, null, 65, 78, null],
        ],
    },
    {
        id: 46, ticketNumber: 46, colorGroup: 'red',
        rows: [
            [null, 19, null, 32, null, 58, 64, null, 84],
            [null, 13, 20, null, 48, 55, null, 77, null],
            [2, null, 21, null, 46, null, null, 75, 82],
        ],
    },
    {
        id: 47, ticketNumber: 47, colorGroup: 'red',
        rows: [
            [8, null, 22, null, 47, null, 66, 72, null],
            [9, 12, null, 37, 42, null, null, null, 88],
            [null, 15, null, 36, null, 51, 68, null, 90],
        ],
    },
    {
        id: 48, ticketNumber: 48, colorGroup: 'red',
        rows: [
            [null, null, null, 38, 44, null, 62, 70, null],
            [6, 18, null, null, null, 59, null, 74, 83],
            [null, 17, null, null, 41, null, 60, null, 86],
        ],
    },
];
function getTicketByNumber(ticketNumber) {
    return exports.FIXED_TICKETS.find(t => t.ticketNumber === ticketNumber);
}
function getTicketsByColor(colorGroup) {
    return exports.FIXED_TICKETS.filter(t => t.colorGroup === colorGroup);
}
//# sourceMappingURL=ticket-data.js.map