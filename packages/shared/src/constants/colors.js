"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COLOR_GROUPS = void 0;
exports.getColorForTicket = getColorForTicket;
exports.getColorForSheet = getColorForSheet;
exports.COLOR_GROUPS = {
    orange: {
        name: 'Orange',
        nameVi: 'Cam',
        hex: '#FF8C00',
        bgHex: '#FFA500',
        tickets: [1, 2, 3, 4, 5, 6],
        sheets: [1, 2],
    },
    yellow: {
        name: 'Yellow',
        nameVi: 'Vàng',
        hex: '#DAA520',
        bgHex: '#FFD700',
        tickets: [7, 8, 9, 10, 11, 12],
        sheets: [3, 4],
    },
    purple: {
        name: 'Purple',
        nameVi: 'Tím',
        hex: '#7B68EE',
        bgHex: '#9370DB',
        tickets: [13, 14, 15, 16, 17, 18],
        sheets: [5, 6],
    },
    pink: {
        name: 'Pink',
        nameVi: 'Hồng',
        hex: '#FF69B4',
        bgHex: '#FFB6C1',
        tickets: [19, 20, 21, 22, 23, 24],
        sheets: [7, 8],
    },
    blue: {
        name: 'Blue',
        nameVi: 'Xanh dương',
        hex: '#4169E1',
        bgHex: '#6495ED',
        tickets: [25, 26, 27, 28, 29, 30],
        sheets: [9, 10],
    },
    green: {
        name: 'Green',
        nameVi: 'Xanh lá',
        hex: '#3CB371',
        bgHex: '#66CDAA',
        tickets: [31, 32, 33, 34, 35, 36],
        sheets: [11, 12],
    },
    lime: {
        name: 'Lime',
        nameVi: 'Xanh non',
        hex: '#9ACD32',
        bgHex: '#ADFF2F',
        tickets: [37, 38, 39, 40, 41, 42],
        sheets: [13, 14],
    },
    red: {
        name: 'Red',
        nameVi: 'Đỏ',
        hex: '#DC143C',
        bgHex: '#FF6B6B',
        tickets: [43, 44, 45, 46, 47, 48],
        sheets: [15, 16],
    },
};
function getColorForTicket(ticketNumber) {
    for (const [group, info] of Object.entries(exports.COLOR_GROUPS)) {
        if (info.tickets.includes(ticketNumber)) {
            return group;
        }
    }
    throw new Error(`Invalid ticket number: ${ticketNumber}`);
}
function getColorForSheet(sheetNumber) {
    for (const [group, info] of Object.entries(exports.COLOR_GROUPS)) {
        if (info.sheets.includes(sheetNumber)) {
            return group;
        }
    }
    throw new Error(`Invalid sheet number: ${sheetNumber}`);
}
//# sourceMappingURL=colors.js.map