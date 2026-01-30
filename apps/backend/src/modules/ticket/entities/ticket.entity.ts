import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('tickets')
export class TicketEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'ticket_number', type: 'int', unique: true })
  ticketNumber: number;

  @Column({
    name: 'color_group',
    type: 'enum',
    enum: ['orange', 'yellow', 'purple', 'pink', 'blue', 'green', 'lime', 'red'],
  })
  colorGroup: string;

  @Column({ name: 'row1', type: 'json' })
  row1: (number | null)[];

  @Column({ name: 'row2', type: 'json' })
  row2: (number | null)[];

  @Column({ name: 'row3', type: 'json' })
  row3: (number | null)[];
}
