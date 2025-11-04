import express from 'express';
import { config } from './config/config';
import { initializeDatabase } from './database/schema';
import { BookingService } from './database/bookingService';
import { PaymeService } from './payments/payme';
import { ClickService } from './payments/click';
import { TelegramBot } from './bot/bot';
import { setupWebhooks } from './server/webhooks';

async function main() {
  try {
    console.log('Starting Conference Booking Bot...');

    // Initialize database
    console.log('Initializing database...');
    const db = initializeDatabase(config.database.path);
    const bookingService = new BookingService(db);

    // Initialize payment services
    console.log('Initializing payment services...');
    const paymeService = new PaymeService(bookingService);
    const clickService = new ClickService(bookingService);

    // Initialize Express server for webhooks
    console.log('Starting webhook server...');
    const app = express();
    setupWebhooks(app, paymeService, clickService);

    const server = app.listen(config.server.port, () => {
      console.log(`Webhook server listening on port ${config.server.port}`);
    });

    // Initialize Telegram bot
    console.log('Starting Telegram bot...');
    const bot = new TelegramBot(bookingService, paymeService, clickService);
    bot.launch();

    console.log('✅ Conference Booking Bot is running!');
    console.log(`📅 Conference: ${config.conference.name}`);
    console.log(`💰 Ticket Price: ${config.conference.ticketPrice / 100} UZS`);
    console.log(`🌐 Webhook URL: ${config.server.webhookDomain}`);

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down gracefully...');
      bot.stop();
      server.close();
      db.close();
      console.log('Goodbye!');
      process.exit(0);
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

main();
