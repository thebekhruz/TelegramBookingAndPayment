import { Telegraf, Context } from 'telegraf';
import { config } from './config';
import { BookingService, Booking } from './database';
import { getTranslations, detectLanguage, Language } from './translations';

interface SessionData {
  step?: string;
  phone?: string;
  language?: Language;
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

  // Helper function to get user language
  function getUserLanguage(ctx: BotContext): Language {
    if (!ctx.from) return 'en';
    const userId = ctx.from.id;
    const session = sessions.get(userId);
    if (session?.language) {
      return session.language;
    }
    // Try to detect from Telegram language
    return detectLanguage(ctx.from.language_code);
  }

  // Session middleware
  bot.use((ctx, next) => {
    const userId = ctx.from?.id;
    if (userId) {
      if (!sessions.has(userId)) {
        // Detect language on first interaction
        const lang = detectLanguage(ctx.from.language_code);
        sessions.set(userId, { language: lang });
      }
      ctx.session = sessions.get(userId)!;
    }
    return next();
  });

  // Language selection command
  bot.command('language', async (ctx) => {
    const t = getTranslations(getUserLanguage(ctx));
    await ctx.reply(t.selectLanguage, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🇬🇧 English', callback_data: 'lang_en' }],
          [{ text: '🇷🇺 Русский', callback_data: 'lang_ru' }],
        ],
      },
    });
  });

  // Start command
  bot.command('start', async (ctx) => {
    const userId = ctx.from.id;
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    const existingBooking = bookingService.getBookingByUserId(userId);

    if (existingBooking) {
      const status = existingBooking.status === 'confirmed' ? t.statusConfirmed : t.statusPending;
      await ctx.reply(
        t.existingBooking(config.conference.name, config.conference.date, config.conference.location, status)
      );
      return;
    }

    await ctx.reply(
      t.welcome(config.conference.name, config.conference.date, config.conference.location, formatPrice(config.conference.ticketPrice))
    );
  });

  // Book command
  bot.command('book', async (ctx) => {
    const userId = ctx.from.id;
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    const existingBooking = bookingService.getBookingByUserId(userId);

    if (existingBooking) {
      await ctx.reply(t.existingBooking(config.conference.name, config.conference.date, config.conference.location, existingBooking.status === 'confirmed' ? t.statusConfirmed : t.statusPending));
      return;
    }

    // Use Telegram profile info automatically
    const fullName = `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`.trim();
    
    if (!fullName || fullName.length < 2) {
      await ctx.reply(t.profileNameTooShort);
      return;
    }

    ctx.session.step = 'awaiting_phone';
    await ctx.reply(
      t.phoneRequest(fullName),
      {
        reply_markup: {
          keyboard: [
            [{ text: '📱 Share My Contact', request_contact: true }],
            [{ text: t.cancelOption }]
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );
  });

  // My booking command
  bot.command('mybooking', async (ctx) => {
    const userId = ctx.from.id;
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    const booking = bookingService.getBookingByUserId(userId);

    if (!booking) {
      await ctx.reply(t.bookingNotFound);
      return;
    }

    const statusText = booking.status === 'confirmed' ? t.statusConfirmed : t.pendingPayment;
    await ctx.reply(
      t.bookingDetails(booking.full_name, booking.phone, config.conference.name, config.conference.date, config.conference.location, formatPrice(config.conference.ticketPrice), booking.id, statusText),
      { parse_mode: 'Markdown' }
    );

    // If pending, offer to pay
    if (booking.status === 'pending') {
      try {
        const lang = getUserLanguage(ctx);
        const t = getTranslations(lang);
        await ctx.replyWithInvoice({
          title: t.invoiceTitle(config.conference.name),
          description: t.invoiceDescription(booking.full_name, config.conference.date, config.conference.location, booking.id),
          payload: `booking_${booking.id}_${booking.user_id}_${Date.now()}`,
          currency: 'UZS',
          prices: [
            {
              label: 'Conference Ticket',
              amount: config.conference.ticketPrice,
            },
          ],
        } as any); // provider_token not needed when configured via BotFather
      } catch (error: any) {
        console.error('❌ Error sending invoice:', error);
        const lang = getUserLanguage(ctx);
        const t = getTranslations(lang);
        
        let errorMessage = `${t.paymentError}\n\n**Error:** ${error.message}`;
        
        // Specific error for payment provider issues
        if (error.message?.includes('PAYMENT_PROVIDER_INVALID') || error.description?.includes('PAYMENT_PROVIDER_INVALID')) {
          errorMessage += `\n\n⚠️ **Payment Provider Not Configured**\n\n` +
            `This error means payment providers are not properly set up in BotFather.\n\n` +
            `**To fix:**\n` +
            `1. Open @BotFather on Telegram\n` +
            `2. Send /mybots\n` +
            `3. Select your bot → "Payments"\n` +
            `4. Add Click.uz and/or Payme.uz\n` +
            `5. Follow instructions to connect your merchant account\n\n` +
            `**Test tokens:** See PAYMENT_TEST_TOKENS.md file`;
        }
        
        await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
      }
    }
  });

  // Cancel command
  bot.command('cancel', async (ctx) => {
    const userId = ctx.from.id;
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    const booking = bookingService.getBookingByUserId(userId);

    if (!booking) {
      await ctx.reply(t.bookingNotFound);
      return;
    }

    await bookingService.deleteBooking(booking.id);
    sessions.delete(userId);
    await ctx.reply(t.bookingCancelled);
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
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    const isAdmin = config.telegram.adminUserId && ctx.from.id === config.telegram.adminUserId;
    let helpText = t.help;
    
    if (isAdmin) {
      helpText += '\n\n👑 Admin Commands:\n/confirm - Confirm your booking (test)';
    }

    await ctx.reply(helpText);
  });

  // Handle callback queries (language selection)
  bot.on('callback_query', async (ctx) => {
    if (!('data' in ctx.callbackQuery)) return;
    
    const data = ctx.callbackQuery.data;
    if (data?.startsWith('lang_')) {
      const lang = data.replace('lang_', '') as Language;
      if (lang === 'en' || lang === 'ru') {
        const userId = ctx.from.id;
        if (!sessions.has(userId)) {
          sessions.set(userId, {});
        }
        sessions.get(userId)!.language = lang;
        const t = getTranslations(lang);
        await ctx.answerCbQuery(t.languageChanged(lang));
        await ctx.editMessageText(t.languageChanged(lang));
      }
      return;
    }
  });

  // Handle contact sharing
  bot.on('contact', async (ctx) => {
    const step = ctx.session.step;
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    
    if (step !== 'awaiting_phone') {
      return;
    }

    const contact = ctx.message.contact;
    if (!contact || !contact.phone_number) {
      await ctx.reply(t.invalidPhone);
      return;
    }

    // Verify contact belongs to the user
    if (contact.user_id && contact.user_id !== ctx.from.id) {
      await ctx.reply(t.invalidPhone);
      return;
    }

    await processBookingCreation(ctx, contact.phone_number);
  });

  // Handle text messages for booking flow
  bot.on('text', async (ctx) => {
    const step = ctx.session.step;
    if (!step) return;

    const text = ctx.message.text?.trim();
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);

    // Handle cancel
    if (text?.toLowerCase() === 'cancel' || text?.toLowerCase() === '/cancel' || text === t.cancelOption) {
      ctx.session.step = undefined;
      await ctx.reply(t.bookingCancelled, {
        reply_markup: { remove_keyboard: true },
      });
      return;
    }

    switch (step) {
      case 'awaiting_phone':
        if (!text || !isValidPhone(text)) {
          await ctx.reply(t.invalidPhone);
          return;
        }

        await processBookingCreation(ctx, text);
        break;
    }
  });

  // Helper function to create booking and send invoice
  async function processBookingCreation(ctx: BotContext, phoneNumber: string) {
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    
    if (!ctx.from) {
      await ctx.reply('❌ Error: Could not identify user. Please try again.');
      return;
    }

    const fullName = `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`.trim();
    
    if (!fullName || fullName.length < 2) {
      await ctx.reply(t.profileNameTooShort);
      return;
    }

    try {
      const booking = bookingService.createBooking(
        ctx.from.id,
        ctx.from.username,
        fullName,
        '', // Email not required
        phoneNumber
      );

      ctx.session.step = undefined;
      
      // Remove keyboard
      await ctx.reply('✅ Booking created successfully!', {
        reply_markup: { remove_keyboard: true },
      });

      await ctx.reply(
        t.bookingCreated(booking.full_name, booking.phone, config.conference.name, config.conference.date, config.conference.location, formatPrice(config.conference.ticketPrice)),
        { parse_mode: 'Markdown' }
      );

      // Send payment invoice
      try {
        await ctx.replyWithInvoice({
          title: t.invoiceTitle(config.conference.name),
          description: t.invoiceDescription(booking.full_name, config.conference.date, config.conference.location, booking.id),
          payload: `booking_${booking.id}_${booking.user_id}_${Date.now()}`,
          currency: 'UZS',
          prices: [
            {
              label: 'Conference Ticket',
              amount: config.conference.ticketPrice,
            },
          ],
        } as any); // provider_token not needed when configured via BotFather
      } catch (error: any) {
        console.error('❌ Error sending invoice:', error);
        await ctx.reply(
          `${t.paymentError}\n\n**Error:** ${error.message}\n\nPlease try using /mybooking to pay, or contact support.`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error: any) {
      console.error('❌ Error creating booking:', error);
      await ctx.reply(
        '❌ An error occurred while creating your booking. Please try again or use /cancel to start over.',
        { reply_markup: { remove_keyboard: true } }
      );
    }
  }

  // Handle successful payment
  bot.on('successful_payment', async (ctx) => {
    const lang = getUserLanguage(ctx);
    const t = getTranslations(lang);
    
    try {
      const payment = ctx.message.successful_payment;
      const payload = payment.invoice_payload;

      // Extract booking ID from payload: booking_{bookingId}_{userId}_{timestamp}
      const match = payload.match(/^booking_(\d+)_/);
      if (!match || !match[1]) {
        console.error('❌ Could not extract booking ID from payload:', payload);
        await ctx.reply('❌ Error processing payment. Please contact support.');
        return;
      }

      const bookingId = parseInt(match[1], 10);
      const booking = bookingService.getBookingById(bookingId);

      if (!booking) {
        console.error(`❌ Booking #${bookingId} not found`);
        await ctx.reply('❌ Booking not found. Please contact support.');
        return;
      }

      if (booking.status === 'confirmed') {
        await ctx.reply('✅ This booking is already confirmed. Thank you!');
        return;
      }

      // Verify payment amount matches
      if (payment.total_amount !== config.conference.ticketPrice) {
        console.error(`❌ Payment amount mismatch: expected ${config.conference.ticketPrice}, got ${payment.total_amount}`);
        await ctx.reply('❌ Payment amount mismatch. Please contact support.');
        return;
      }

      // Confirm booking and send notifications
      await (bot as any).confirmBookingAndNotify(bookingId);

      await ctx.reply(t.paymentSuccess, { parse_mode: 'Markdown' });
    } catch (error: any) {
      console.error('❌ Error processing payment:', error);
      await ctx.reply('❌ Error processing payment. Please contact support.');
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
