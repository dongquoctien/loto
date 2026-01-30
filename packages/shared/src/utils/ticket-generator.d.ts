import { TicketData, ColorGroup } from '../types/ticket.types';
export declare function generateRandomTicket(ticketNumber: number, colorGroup: ColorGroup): TicketData;
export declare function generateRandomSheets(count: number, startingTicketNumber: number, colorGroup: ColorGroup): TicketData[][];
export declare function validateTicket(ticket: TicketData): {
    valid: boolean;
    errors: string[];
};
