import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TicketEntity } from './ticket.entity';

@Entity('sheets')
export class SheetEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'sheet_number', type: 'int', unique: true })
  sheetNumber: number;

  @Column({
    name: 'color_group',
    type: 'enum',
    enum: ['orange', 'yellow', 'purple', 'pink', 'blue', 'green', 'lime', 'red', 'teal', 'brown'],
  })
  colorGroup: string;

  @Column({ name: 'ticket1_id' })
  ticket1Id: number;

  @Column({ name: 'ticket2_id' })
  ticket2Id: number;

  @Column({ name: 'ticket3_id' })
  ticket3Id: number;

  @ManyToOne(() => TicketEntity)
  @JoinColumn({ name: 'ticket1_id' })
  ticket1: TicketEntity;

  @ManyToOne(() => TicketEntity)
  @JoinColumn({ name: 'ticket2_id' })
  ticket2: TicketEntity;

  @ManyToOne(() => TicketEntity)
  @JoinColumn({ name: 'ticket3_id' })
  ticket3: TicketEntity;
}
