import { config } from './config';
import { initDatabase, BookingService } from './database';
import { createBot, BotContext } from './bot';
import { Telegraf } from 'telegraf';

// Export bot instance for use in payment webhooks
export let botInstance: (Telegraf<BotContext> & {
  confirmBookingAndNotify: (bookingId: number) => Promise<void>;
}) | null = null;

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
  botInstance = bot as typeof botInstance;

  // Log admin notification status
  if (config.telegram.adminUserId) {
    console.log(`👑 Admin notifications enabled for user ID: ${config.telegram.adminUserId}\n`);
  } else {
    console.log('⚠️  ADMIN_USER_ID not set. Admin notifications disabled.\n');
  }

  bot.launch();
  console.log('✅ Bot is running!\n');
  
  console.log('💳 Payment: Using Telegram native invoices (Click.uz & Payme via BotFather)\n');

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
