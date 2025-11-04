import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
  },
  conference: {
    name: process.env.CONFERENCE_NAME || 'Tech Conference 2024',
    date: process.env.CONFERENCE_DATE || '2024-12-15',
    location: process.env.CONFERENCE_LOCATION || 'Tashkent, Uzbekistan',
    ticketPrice: parseInt(process.env.TICKET_PRICE || '100000'),
  },
  database: {
    path: process.env.DATABASE_PATH || './bookings.db',
  },
};
