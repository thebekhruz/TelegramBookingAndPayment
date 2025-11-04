import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { BookingService } from './database';

interface SessionData {
  step?: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

export interface BotContext extends Context {
  session: SessionData;
}

export function createBot(bookingService: BookingService): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(config.telegram.botToken);
  const sessions = new Map<number, SessionData>();

  // Session middleware
  bot.use((ctx, next) => {
    const userId = ctx.from?.id;
    if (userId) {
      if (!sessions.has(userId)) {
        sessions.set(userId, {});
      }
      ctx.session = sessions.get(userId)!;
    }
    return next();
  });

  // Start command
  bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const existingBooking = await bookingService.getBookingByUserId(userId);

    if (existingBooking) {
      await ctx.reply(
        `✅ You already have a booking!\n\n` +
        `📅 ${config.conference.name}\n` +
        `📆 Date: ${config.conference.date}\n` +
        `📍 Location: ${config.conference.location}\n\n` +
        `Status: ${existingBooking.status === 'confirmed' ? '✅ Confirmed' : '⏳ Pending'}\n\n` +
        `Use /mybooking to view details or /cancel to cancel.`
      );
      return;
    }

    await ctx.reply(
      `👋 Welcome to ${config.conference.name}!\n\n` +
      `📆 Date: ${config.conference.date}\n` +
      `📍 Location: ${config.conference.location}\n` +
      `💰 Price: ${formatPrice(config.conference.ticketPrice)} UZS\n\n` +
      `Ready to book your ticket? Use /book to get started!`
    );
  });

  // Book command
  bot.command('book', async (ctx) => {
    const userId = ctx.from.id;
    const existingBooking = await bookingService.getBookingByUserId(userId);

    if (existingBooking) {
      await ctx.reply('You already have a booking! Use /mybooking to view it.');
      return;
    }

    ctx.session.step = 'awaiting_name';
    await ctx.reply('📝 Let\'s book your ticket!\n\nPlease enter your full name:');
  });

  // My booking command
  bot.command('mybooking', async (ctx) => {
    const userId = ctx.from.id;
    const booking = await bookingService.getBookingByUserId(userId);

    if (!booking) {
      await ctx.reply('You don\'t have any bookings yet. Use /book to create one!');
      return;
    }

    const statusEmoji = booking.status === 'confirmed' ? '✅' : '⏳';
    await ctx.reply(
      `${statusEmoji} Your Booking\n\n` +
      `Name: ${booking.full_name}\n` +
      `Email: ${booking.email}\n` +
      `Phone: ${booking.phone}\n` +
      `Status: ${booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}\n\n` +
      `📆 ${config.conference.date}\n` +
      `📍 ${config.conference.location}`
    );
  });

  // Cancel command
  bot.command('cancel', async (ctx) => {
    const userId = ctx.from.id;
    const booking = await bookingService.getBookingByUserId(userId);

    if (!booking) {
      await ctx.reply('You don\'t have any bookings to cancel.');
      return;
    }

    await bookingService.deleteBooking(booking.id);
    sessions.delete(userId);
    await ctx.reply('✅ Your booking has been cancelled. Use /book to create a new one.');
  });

  // Help command
  bot.command('help', async (ctx) => {
    await ctx.reply(
      '🤖 Available Commands:\n\n' +
      '/start - Start the bot\n' +
      '/book - Book a conference ticket\n' +
      '/mybooking - View your booking\n' +
      '/cancel - Cancel your booking\n' +
      '/help - Show this help message'
    );
  });

  // Handle text messages for booking flow
  bot.on('text', async (ctx) => {
    const step = ctx.session.step;
    if (!step) return;

    const text = ctx.message.text;

    try {
      switch (step) {
        case 'awaiting_name':
          if (text.trim().length < 2) {
            await ctx.reply('Please enter a valid full name (at least 2 characters):');
            return;
          }
          ctx.session.fullName = text.trim();
          ctx.session.step = 'awaiting_email';
          await ctx.reply('✉️ Great! Now enter your email address:');
          break;

        case 'awaiting_email':
          if (!isValidEmail(text)) {
            await ctx.reply('Please enter a valid email address:');
            return;
          }
          ctx.session.email = text.trim();
          ctx.session.step = 'awaiting_phone';
          await ctx.reply('📱 Perfect! Now enter your phone number (e.g., +998901234567):');
          break;

        case 'awaiting_phone':
          if (!isValidPhone(text)) {
            await ctx.reply('Please enter a valid phone number:');
            return;
          }
          ctx.session.phone = text.trim();

          // Create booking
          try {
            const booking = await bookingService.createBooking(
              ctx.from!.id,
              ctx.from!.username,
              ctx.session.fullName!,
              ctx.session.email!,
              ctx.session.phone!
            );

            ctx.session.step = undefined;

            await ctx.reply(
              `✅ Booking created successfully!\n\n` +
              `Name: ${booking.full_name}\n` +
              `Email: ${booking.email}\n` +
              `Phone: ${booking.phone}\n\n` +
              `📆 ${config.conference.date}\n` +
              `📍 ${config.conference.location}\n` +
              `💰 Price: ${formatPrice(config.conference.ticketPrice)} UZS\n\n` +
              `Status: ⏳ Pending\n\n` +
              `Your booking is confirmed! Use /mybooking to view it anytime.`
            );
          } catch (error) {
            await ctx.reply('An error occurred. Please try again or use /cancel to start over.');
          }
          break;
      }
    } catch (error) {
      console.error('Error in text handler:', error);
      await ctx.reply('An error occurred. Please try again.');
    }
  });

  return bot;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone: string): boolean {
  return /^\+?[0-9]{9,15}$/.test(phone.replace(/[\s-]/g, ''));
}

function formatPrice(price: number): string {
  return (price / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
