import { DataSource } from 'typeorm';
import { TicketEntity } from '../../modules/ticket/entities/ticket.entity';
import { SheetEntity } from '../../modules/ticket/entities/sheet.entity';
import { FIXED_TICKETS } from '@loto/shared';
import { SHEET_TO_TICKETS } from '@loto/shared';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from project root
config({ path: resolve(__dirname, '../../../../../.env') });

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'loto_user',
  password: process.env.DB_PASSWORD || 'loto_password',
  database: process.env.DB_DATABASE || 'loto_db',
  entities: [TicketEntity, SheetEntity],
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const ticketRepo = dataSource.getRepository(TicketEntity);
  const sheetRepo = dataSource.getRepository(SheetEntity);

  // Ensure enum columns include new color groups
  await dataSource.query(`ALTER TABLE tickets MODIFY COLUMN color_group ENUM('orange','yellow','purple','pink','blue','green','lime','red','teal','brown') NOT NULL`);
  await dataSource.query(`ALTER TABLE sheets MODIFY COLUMN color_group ENUM('orange','yellow','purple','pink','blue','green','lime','red','teal','brown') NOT NULL`);
  console.log('Updated color_group enum columns');

  // Clear existing data (disable FK checks for truncate)
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  await sheetRepo.clear();
  await ticketRepo.clear();
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('Cleared existing ticket and sheet data');

  // Seed tickets
  const savedTickets: TicketEntity[] = [];
  for (const ticket of FIXED_TICKETS) {
    const entity = ticketRepo.create({
      ticketNumber: ticket.ticketNumber,
      colorGroup: ticket.colorGroup,
      row1: ticket.rows[0] as (number | null)[],
      row2: ticket.rows[1] as (number | null)[],
      row3: ticket.rows[2] as (number | null)[],
    });
    const saved = await ticketRepo.save(entity);
    savedTickets.push(saved);
    console.log(`Seeded ticket #${ticket.ticketNumber} (${ticket.colorGroup})`);
  }

  // Seed sheets
  for (const [sheetNumStr, ticketNumbers] of Object.entries(SHEET_TO_TICKETS)) {
    const sheetNumber = parseInt(sheetNumStr, 10);
    const [t1Num, t2Num, t3Num] = ticketNumbers;

    const ticket1 = savedTickets.find((t) => t.ticketNumber === t1Num);
    const ticket2 = savedTickets.find((t) => t.ticketNumber === t2Num);
    const ticket3 = savedTickets.find((t) => t.ticketNumber === t3Num);

    if (!ticket1 || !ticket2 || !ticket3) {
      console.error(`Missing tickets for sheet ${sheetNumber}`);
      continue;
    }

    // Determine color group from first ticket
    const colorGroup = ticket1.colorGroup;

    const sheet = sheetRepo.create({
      sheetNumber,
      colorGroup,
      ticket1Id: ticket1.id,
      ticket2Id: ticket2.id,
      ticket3Id: ticket3.id,
    });

    await sheetRepo.save(sheet);
    console.log(
      `Seeded sheet #${sheetNumber} (${colorGroup}) -> tickets [${t1Num}, ${t2Num}, ${t3Num}]`,
    );
  }

  console.log(`\nDone! Seeded ${savedTickets.length} tickets and ${Object.keys(SHEET_TO_TICKETS).length} sheets.`);
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
