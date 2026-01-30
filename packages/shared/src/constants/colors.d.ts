import { ColorGroup, ColorGroupInfo } from '../types/ticket.types';
export declare const COLOR_GROUPS: Record<ColorGroup, ColorGroupInfo>;
export declare function getColorForTicket(ticketNumber: number): ColorGroup;
export declare function getColorForSheet(sheetNumber: number): ColorGroup;
