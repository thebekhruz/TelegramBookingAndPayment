import { Telegraf, Markup, Context } from 'telegraf';
import { config } from '../config/config';
import { BookingService } from '../database/bookingService';
import { PaymeService } from '../payments/payme';
import { ClickService } from '../payments/click';
import { Booking } from '../database/schema';

interface SessionData {
  step?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  bookingId?: number;
}

export interface BotContext extends Context {
  session: SessionData;
}

export class TelegramBot {
  private bot: Telegraf<BotContext>;
  private bookingService: BookingService;
  private paymeService: PaymeService;
  private clickService: ClickService;
  private sessions: Map<number, SessionData>;

  constructor(
    bookingService: BookingService,
    paymeService: PaymeService,
    clickService: ClickService
  ) {
    this.bot = new Telegraf<BotContext>(config.telegram.botToken);
    this.bookingService = bookingService;
    this.paymeService = paymeService;
    this.clickService = clickService;
    this.sessions = new Map();

    this.setupMiddleware();
    this.setupCommands();
    this.setupHandlers();
  }

  private setupMiddleware() {
    // Session middleware
    this.bot.use((ctx, next) => {
      const userId = ctx.from?.id;
      if (userId) {
        if (!this.sessions.has(userId)) {
          this.sessions.set(userId, {});
        }
        ctx.session = this.sessions.get(userId)!;
      }
      return next();
    });
  }

  private setupCommands() {
    // Start command
    this.bot.command('start', async (ctx) => {
      const userId = ctx.from.id;
      const existingBooking = this.bookingService.getBookingByUserId(userId);

      if (existingBooking) {
        if (existingBooking.payment_status === 'paid') {
          await ctx.reply(
            `🎉 You already have a confirmed booking for ${config.conference.name}!\n\n` +
              `📅 Date: ${config.conference.date}\n` +
              `📍 Location: ${config.conference.location}\n\n` +
              `Your ticket has been paid. See you at the conference!`
          );
          return;
        } else if (existingBooking.payment_status === 'pending') {
          await this.sendPaymentOptions(ctx, existingBooking.id);
          return;
        }
      }

      await ctx.reply(
        `👋 Welcome to ${config.conference.name} Booking!\n\n` +
          `📅 Date: ${config.conference.date}\n` +
          `📍 Location: ${config.conference.location}\n` +
          `💰 Ticket Price: ${this.formatPrice(config.conference.ticketPrice)} UZS\n\n` +
          `To book your ticket, use /book command.`
      );
    });

    // Book command
    this.bot.command('book', async (ctx) => {
      const userId = ctx.from.id;
      const existingBooking = this.bookingService.getBookingByUserId(userId);

      if (existingBooking && existingBooking.payment_status === 'paid') {
        await ctx.reply('You already have a paid booking for this conference!');
        return;
      }

      ctx.session.step = 'awaiting_name';
      await ctx.reply(
        '📝 Let\'s start the booking process!\n\n' +
          'Please enter your full name:'
      );
    });

    // My booking command
    this.bot.command('mybooking', async (ctx) => {
      const userId = ctx.from.id;
      const booking = this.bookingService.getBookingByUserId(userId);

      if (!booking) {
        await ctx.reply('You don\'t have any bookings yet. Use /book to create one!');
        return;
      }

      await this.sendBookingInfo(ctx, booking);
    });

    // Cancel booking command
    this.bot.command('cancel', async (ctx) => {
      const userId = ctx.from.id;
      const booking = this.bookingService.getBookingByUserId(userId);

      if (!booking) {
        await ctx.reply('You don\'t have any bookings to cancel.');
        return;
      }

      if (booking.payment_status === 'paid') {
        await ctx.reply('Cannot cancel a paid booking. Please contact support.');
        return;
      }

      this.bookingService.deleteBooking(booking.id);
      this.sessions.delete(userId);
      await ctx.reply('Your booking has been cancelled.');
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        '🤖 Available Commands:\n\n' +
          '/start - Start the bot\n' +
          '/book - Book a conference ticket\n' +
          '/mybooking - View your booking\n' +
          '/cancel - Cancel your booking\n' +
          '/help - Show this help message'
      );
    });
  }

  private setupHandlers() {
    // Handle text messages based on session step
    this.bot.on('text', async (ctx) => {
      const step = ctx.session.step;
      const text = ctx.message.text;

      if (!step) {
        return;
      }

      switch (step) {
        case 'awaiting_name':
          if (text.trim().length < 2) {
            await ctx.reply('Please enter a valid full name (at least 2 characters).');
            return;
          }
          ctx.session.fullName = text.trim();
          ctx.session.step = 'awaiting_email';
          await ctx.reply('✉️ Please enter your email address:');
          break;

        case 'awaiting_email':
          if (!this.isValidEmail(text)) {
            await ctx.reply('Please enter a valid email address.');
            return;
          }
          ctx.session.email = text.trim();
          ctx.session.step = 'awaiting_phone';
          await ctx.reply('📱 Please enter your phone number (e.g., +998901234567):');
          break;

        case 'awaiting_phone':
          if (!this.isValidPhone(text)) {
            await ctx.reply('Please enter a valid phone number.');
            return;
          }
          ctx.session.phone = text.trim();
          await this.createBookingAndShowPayment(ctx);
          break;
      }
    });

    // Handle callback queries
    this.bot.on('callback_query', async (ctx) => {
      const data = (ctx.callbackQuery as any).data;

      if (data.startsWith('pay_')) {
        const [, method, bookingId] = data.split('_');
        await this.handlePaymentMethod(ctx, method, parseInt(bookingId));
      }

      await ctx.answerCbQuery();
    });
  }

  private async createBookingAndShowPayment(ctx: BotContext) {
    const userId = ctx.from!.id;
    const username = ctx.from!.username;

    try {
      // Check if booking already exists
      let booking = this.bookingService.getBookingByUserId(userId);

      if (booking && booking.payment_status === 'paid') {
        await ctx.reply('You already have a paid booking!');
        return;
      }

      if (!booking) {
        // Create new booking
        booking = this.bookingService.createBooking(
          userId,
          username,
          ctx.session.fullName!,
          ctx.session.email!,
          ctx.session.phone!
        );
      }

      ctx.session.bookingId = booking.id;
      ctx.session.step = undefined;

      await ctx.reply(
        '✅ Booking created successfully!\n\n' +
          `Name: ${booking.full_name}\n` +
          `Email: ${booking.email}\n` +
          `Phone: ${booking.phone}\n\n` +
          `Amount: ${this.formatPrice(config.conference.ticketPrice)} UZS\n\n` +
          'Please select a payment method:'
      );

      await this.sendPaymentOptions(ctx, booking.id);
    } catch (error) {
      console.error('Error creating booking:', error);
      await ctx.reply('An error occurred. Please try again later or use /cancel to start over.');
    }
  }

  private async sendPaymentOptions(ctx: Context, bookingId: number) {
    await ctx.reply(
      '💳 Select Payment Method:',
      Markup.inlineKeyboard([
        [Markup.button.callback('💵 Pay with Payme', `pay_payme_${bookingId}`)],
        [Markup.button.callback('💰 Pay with Click', `pay_click_${bookingId}`)],
      ])
    );
  }

  private async handlePaymentMethod(ctx: Context, method: string, bookingId: number) {
    const booking = this.bookingService.getBookingById(bookingId);

    if (!booking) {
      await ctx.reply('Booking not found. Please use /book to create a new one.');
      return;
    }

    if (booking.payment_status === 'paid') {
      await ctx.reply('This booking is already paid!');
      return;
    }

    let paymentUrl: string;
    if (method === 'payme') {
      paymentUrl = this.paymeService.generatePaymentUrl(bookingId, config.conference.ticketPrice);
    } else if (method === 'click') {
      paymentUrl = this.clickService.generatePaymentUrl(bookingId, config.conference.ticketPrice);
    } else {
      await ctx.reply('Invalid payment method.');
      return;
    }

    await ctx.reply(
      `💳 Please complete the payment:\n\n` +
        `Amount: ${this.formatPrice(config.conference.ticketPrice)} UZS\n\n` +
        `Click the button below to proceed:`,
      Markup.inlineKeyboard([
        [Markup.button.url(`Pay with ${method.toUpperCase()}`, paymentUrl)],
      ])
    );

    await ctx.reply(
      '⏳ After payment, use /mybooking to check your booking status.\n\n' +
        'Note: Payment confirmation may take a few minutes.'
    );
  }

  private async sendBookingInfo(ctx: Context, booking: Booking) {
    const statusEmoji = booking.payment_status === 'paid' ? '✅' : '⏳';
    const statusText = booking.payment_status === 'paid' ? 'Paid' : 'Pending Payment';

    let message =
      `${statusEmoji} Your Booking\n\n` +
      `Name: ${booking.full_name}\n` +
      `Email: ${booking.email}\n` +
      `Phone: ${booking.phone}\n` +
      `Status: ${statusText}\n\n`;

    if (booking.payment_status === 'paid') {
      message +=
        `🎉 Your ticket is confirmed!\n\n` +
        `📅 ${config.conference.date}\n` +
        `📍 ${config.conference.location}\n\n` +
        `See you at the conference!`;
    } else {
      message += `Amount: ${this.formatPrice(config.conference.ticketPrice)} UZS\n\n`;
      await ctx.reply(message);
      await this.sendPaymentOptions(ctx, booking.id);
      return;
    }

    await ctx.reply(message);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    return phoneRegex.test(phone.replace(/[\s-]/g, ''));
  }

  private formatPrice(price: number): string {
    return (price / 100).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }

  public launch() {
    this.bot.launch();
    console.log('Bot started successfully!');
  }

  public stop() {
    this.bot.stop();
  }

  public getBot() {
    return this.bot;
  }
}
