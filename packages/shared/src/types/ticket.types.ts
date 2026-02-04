export type TicketCell = number | null;

export type TicketRow = [
  TicketCell, TicketCell, TicketCell,
  TicketCell, TicketCell, TicketCell,
  TicketCell, TicketCell, TicketCell,
];

export interface TicketData {
  id: number;
  ticketNumber: number;
  colorGroup: ColorGroup;
  rows: [TicketRow, TicketRow, TicketRow];
}

export interface SheetData {
  id: number;
  sheetNumber: number;
  colorGroup: ColorGroup;
  tickets: [TicketData, TicketData, TicketData];
}

export type ColorGroup =
  | 'orange'
  | 'yellow'
  | 'purple'
  | 'pink'
  | 'blue'
  | 'green'
  | 'lime'
  | 'red';

export type WinType = 'horizontal' | 'vertical' | 'diagonal';

export interface ColorGroupInfo {
  name: string;
  nameVi: string;
  hex: string;
  bgHex: string;
  tickets: number[];
  sheets: number[];
}

export interface MarkedCell {
  ticketId: number;
  rowIndex: number;
  colIndex: number;
  numberValue: number;
}

export interface LineDetails {
  rowIndex?: number;
  colIndex?: number;
  direction?: 'main' | 'anti';
  startCol?: number;
}
