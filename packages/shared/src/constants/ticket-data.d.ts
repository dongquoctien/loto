import { TicketData } from '../types/ticket.types';
export declare const FIXED_TICKETS: TicketData[];
export declare function getTicketByNumber(ticketNumber: number): TicketData | undefined;
export declare function getTicketsByColor(colorGroup: string): TicketData[];
