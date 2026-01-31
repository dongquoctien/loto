import { ColorGroup, ColorGroupInfo } from '../types/ticket.types';

export const COLOR_GROUPS: Record<ColorGroup, ColorGroupInfo> = {
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
  teal: {
    name: 'Teal',
    nameVi: 'Xanh ngọc',
    hex: '#008080',
    bgHex: '#20B2AA',
    tickets: [49, 50, 51, 52, 53, 54],
    sheets: [17, 18],
  },
  brown: {
    name: 'Brown',
    nameVi: 'Nâu',
    hex: '#8B4513',
    bgHex: '#CD853F',
    tickets: [55, 56, 57, 58, 59, 60],
    sheets: [19, 20],
  },
};

export function getColorForTicket(ticketNumber: number): ColorGroup {
  for (const [group, info] of Object.entries(COLOR_GROUPS)) {
    if (info.tickets.includes(ticketNumber)) {
      return group as ColorGroup;
    }
  }
  throw new Error(`Invalid ticket number: ${ticketNumber}`);
}

export function getColorForSheet(sheetNumber: number): ColorGroup {
  for (const [group, info] of Object.entries(COLOR_GROUPS)) {
    if (info.sheets.includes(sheetNumber)) {
      return group as ColorGroup;
    }
  }
  throw new Error(`Invalid sheet number: ${sheetNumber}`);
}
