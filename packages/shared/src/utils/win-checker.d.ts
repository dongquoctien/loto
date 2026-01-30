import { TicketData, WinType, LineDetails } from '../types/ticket.types';
export declare function checkHorizontalWin(ticket: TicketData, calledNumbers: Set<number>): {
    won: boolean;
    rowIndex: number;
};
export declare function checkVerticalWin(ticket: TicketData, calledNumbers: Set<number>): {
    won: boolean;
    colIndex: number;
};
export declare function checkDiagonalWin(ticket: TicketData, calledNumbers: Set<number>): {
    won: boolean;
    direction: 'main' | 'anti';
    startCol: number;
};
export declare function validateWinClaim(ticket: TicketData, calledNumbers: Set<number>, winType: WinType, lineDetails: LineDetails): {
    valid: boolean;
    reason: string;
};
export declare function checkAllWins(ticket: TicketData, calledNumbers: Set<number>, enabledWinTypes: {
    horizontal: boolean;
    vertical: boolean;
    diagonal: boolean;
}): {
    hasWin: boolean;
    wins: {
        winType: WinType;
        lineDetails: LineDetails;
    }[];
};
