import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketEntity } from './entities/ticket.entity';
import { SheetEntity } from './entities/sheet.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(TicketEntity)
    private readonly ticketRepository: Repository<TicketEntity>,
    @InjectRepository(SheetEntity)
    private readonly sheetRepository: Repository<SheetEntity>,
  ) {}

  async getAllTickets(): Promise<TicketEntity[]> {
    return this.ticketRepository.find({ order: { ticketNumber: 'ASC' } });
  }

  async getAllSheets(): Promise<SheetEntity[]> {
    return this.sheetRepository.find({
      relations: ['ticket1', 'ticket2', 'ticket3'],
      order: { sheetNumber: 'ASC' },
    });
  }

  async getSheetById(sheetId: number): Promise<SheetEntity | null> {
    return this.sheetRepository.findOne({
      where: { id: sheetId },
      relations: ['ticket1', 'ticket2', 'ticket3'],
    });
  }

  async getSheetByNumber(sheetNumber: number): Promise<SheetEntity | null> {
    return this.sheetRepository.findOne({
      where: { sheetNumber },
      relations: ['ticket1', 'ticket2', 'ticket3'],
    });
  }

  async getTicketById(ticketId: number): Promise<TicketEntity | null> {
    return this.ticketRepository.findOne({ where: { id: ticketId } });
  }
}
