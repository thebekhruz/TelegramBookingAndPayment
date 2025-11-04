import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { BookingService, Booking } from './database';

interface SessionData {
  step?: string;
  fullName?: string;
  phone?: string;
}

export interface BotContext extends Context {
  session: SessionData;
}

export function createBot(bookingService: BookingService): Telegraf<BotContext> {
  const bot = new Telegraf<BotContext>(config.telegram.botToken);
  const sessions = new Map<number, SessionData>();

  // Function to send confirmation notification to admin
  async function sendAdminNotification(booking: Booking): Promise<void> {
    if (!config.telegram.adminUserId) {
      console.log('⚠️  ADMIN_USER_ID not configured. Skipping admin notification.');
      return;
    }

    try {
      const message = `
🔔 **New Booking Confirmed!**

👤 **Customer Details:**
   • Name: ${booking.full_name}
   • Username: @${booking.username || 'N/A'}
   • Phone: ${booking.phone}
   • User ID: ${booking.user_id}

📅 **Conference:**
   • Event: ${config.conference.name}
   • Date: ${config.conference.date}
   • Location: ${config.conference.location}
   • Price: ${formatPrice(config.conference.ticketPrice)} UZS

✅ Status: ${booking.status === 'confirmed' ? 'Confirmed & Paid' : 'Pending'}
📆 Booking Date: ${booking.created_at}
🆔 Booking ID: #${booking.id}
      `.trim();

      await bot.telegram.sendMessage(config.telegram.adminUserId, message, {
        parse_mode: 'Markdown',
      });
      console.log(`✅ Admin notification sent for booking #${booking.id}`);
    } catch (error: any) {
      console.error('❌ Failed to send admin notification:', error.message);
      // Don't throw - admin notification failure shouldn't break the flow
    }
  }

  // Expose function to confirm booking and notify admin
  (bot as any).confirmBookingAndNotify = async (bookingId: number): Promise<void> => {
    const booking = bookingService.getBookingById(bookingId);
    if (!booking) {
      throw new Error(`Booking #${bookingId} not found`);
    }

    // Update booking status
    bookingService.updateBookingStatus(bookingId, 'confirmed');

    // Get updated booking
    const updatedBooking = bookingService.getBookingById(bookingId)!;

    // Notify the customer
    try {
      await bot.telegram.sendMessage(
        updatedBooking.user_id,
        `
✅ **Payment Confirmed!**

Your booking has been confirmed and payment received!

📋 **Booking Details:**
   • Name: ${updatedBooking.full_name}
   • Phone: ${updatedBooking.phone}

📅 **Conference:**
   • ${config.conference.name}
   • Date: ${config.conference.date}
   • Location: ${config.conference.location}

🎫 **Booking ID:** #${updatedBooking.id}

See you at the conference! 🎉
        `.trim()
      );
    } catch (error: any) {
      console.error(`❌ Failed to notify customer ${updatedBooking.user_id}:`, error.message);
    }

    // Notify admin
    await sendAdminNotification(updatedBooking);
  };

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
    const existingBooking = bookingService.getBookingByUserId(userId);

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
    const existingBooking = bookingService.getBookingByUserId(userId);

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
    const booking = bookingService.getBookingByUserId(userId);

    if (!booking) {
      await ctx.reply('You don\'t have any bookings yet. Use /book to create one!');
      return;
    }

    const statusEmoji = booking.status === 'confirmed' ? '✅' : '⏳';
    await ctx.reply(
      `${statusEmoji} Your Booking\n\n` +
      `Name: ${booking.full_name}\n` +
      `Phone: ${booking.phone}\n` +
      `Status: ${booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}\n\n` +
      `📆 ${config.conference.date}\n` +
      `📍 ${config.conference.location}`
    );
  });

  // Cancel command
  bot.command('cancel', async (ctx) => {
    const userId = ctx.from.id;
    const booking = bookingService.getBookingByUserId(userId);

    if (!booking) {
      await ctx.reply('You don\'t have any bookings to cancel.');
      return;
    }

    bookingService.deleteBooking(booking.id);
    sessions.delete(userId);
    await ctx.reply('✅ Your booking has been cancelled. Use /book to create a new one.');
  });

  // Admin command: Confirm booking manually (for testing)
  bot.command('confirm', async (ctx) => {
    // Check if user is admin
    if (config.telegram.adminUserId && ctx.from.id !== config.telegram.adminUserId) {
      await ctx.reply('❌ This command is only available to administrators.');
      return;
    }

    const userId = ctx.from.id;
    const booking = bookingService.getBookingByUserId(userId);

    if (!booking) {
      await ctx.reply('❌ You don\'t have a booking to confirm.');
      return;
    }

    if (booking.status === 'confirmed') {
      await ctx.reply('✅ This booking is already confirmed.');
      return;
    }

    // Confirm booking and send notifications
    try {
      await (bot as any).confirmBookingAndNotify(booking.id);
      await ctx.reply('✅ Booking confirmed! Notifications sent to customer and admin.');
    } catch (error: any) {
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });

  // Help command
  bot.command('help', async (ctx) => {
    const isAdmin = config.telegram.adminUserId && ctx.from.id === config.telegram.adminUserId;
    let helpText = '🤖 Available Commands:\n\n' +
      '/start - Start the bot\n' +
      '/book - Book a conference ticket\n' +
      '/mybooking - View your booking\n' +
      '/cancel - Cancel your booking\n' +
      '/help - Show this help message';
    
    if (isAdmin) {
      helpText += '\n\n👑 Admin Commands:\n/confirm - Confirm your booking (test)';
    }

    await ctx.reply(helpText);
  });

  // Handle text messages for booking flow
  bot.on('text', async (ctx) => {
    const step = ctx.session.step;
    if (!step) return;

    const text = ctx.message.text;

    switch (step) {
      case 'awaiting_name':
        if (text.trim().length < 2) {
          await ctx.reply('Please enter a valid full name (at least 2 characters):');
          return;
        }
        ctx.session.fullName = text.trim();
        ctx.session.step = 'awaiting_phone';
        await ctx.reply('📱 Great! Now enter your phone number (e.g., +998901234567):');
        break;

      case 'awaiting_phone':
        if (!isValidPhone(text)) {
          await ctx.reply('Please enter a valid phone number:');
          return;
        }
        ctx.session.phone = text.trim();

        // Create booking
        try {
          const booking = bookingService.createBooking(
            ctx.from!.id,
            ctx.from!.username,
            ctx.session.fullName!,
            '', // Email not required for now
            ctx.session.phone!
          );

          ctx.session.step = undefined;

          await ctx.reply(
            `✅ Booking created successfully!\n\n` +
            `Name: ${booking.full_name}\n` +
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
  });

  return bot as Telegraf<BotContext> & {
    confirmBookingAndNotify: (bookingId: number) => Promise<void>;
  };
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
