import { config } from './config';
import { initDatabase, BookingService } from './database';
import { createBot } from './bot';

async function main() {
  console.log('🚀 Starting Telegram Conference Booking Bot...\n');

  // Initialize database
  console.log('📦 Initializing database...');
  const db = initDatabase(config.database.path);
  const bookingService = new BookingService(db);
  console.log('✅ Database ready!\n');

  // Initialize bot
  console.log('🤖 Starting Telegram bot...');
  const bot = createBot(bookingService);

  bot.launch();
  console.log('✅ Bot is running!\n');

  console.log('📋 Conference Details:');
  console.log(`   Name: ${config.conference.name}`);
  console.log(`   Date: ${config.conference.date}`);
  console.log(`   Location: ${config.conference.location}`);
  console.log(`   Price: ${config.conference.ticketPrice / 100} UZS\n`);

  console.log('💬 Bot is ready to accept bookings!\n');

  // Graceful shutdown
  process.once('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    bot.stop('SIGINT');
    db.close();
    process.exit(0);
  });

  process.once('SIGTERM', () => {
    console.log('\n👋 Shutting down...');
    bot.stop('SIGTERM');
    db.close();
    process.exit(0);
  });
}

main().catch(error => {
  console.error('❌ Failed to start bot:', error);
  process.exit(1);
});
