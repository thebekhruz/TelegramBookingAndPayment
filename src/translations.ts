export type Language = 'en' | 'ru';

export interface Translations {
  welcome: (name: string, date: string, location: string, price: string) => string;
  existingBooking: (name: string, date: string, location: string, status: string) => string;
  bookingCreated: (name: string, phone: string, confName: string, date: string, location: string, price: string) => string;

  bookingNotFound: string;
  bookingCancelled: string;
  help: string;
  invoiceTitle: (name: string) => string;
  invoiceDescription: (name: string, date: string, location: string, id: number) => string;
  bookingDetails: (name: string, phone: string, confName: string, date: string, location: string, price: string, id: number, status: string) => string;
  paymentSuccess: string;
  paymentError: string;
  phoneRequest: (fullName: string) => string;
  invalidPhone: string;
  profileNameTooShort: string;
  cancelOption: string;
  useCommands: (commands: string) => string;
  statusPending: string;
  statusConfirmed: string;
  pendingPayment: string;
  confirmBooking: string;
  selectLanguage: string;
  languageChanged: (lang: string) => string;
}

const translations: Record<Language, Translations> = {
  en: {
    welcome: (name, date, location, price) =>
      `👋 Welcome to ${name}!\n\n📆 Date: ${date}\n📍 Location: ${location}\n💰 Price: ${price} UZS\n\nReady to book your ticket? Use /book to get started!`,
    existingBooking: (name, date, location, status) =>
      `✅ You already have a booking!\n\n📅 ${name}\n📆 Date: ${date}\n📍 Location: ${location}\n\nStatus: ${status}\n\nUse /mybooking to view details or /cancel to cancel.`,
    bookingCreated: (name, phone, confName, date, location, price) =>
      `📋 **Your Booking Details:**\n\n👤 Name: ${name}\n📱 Phone: ${phone}\n\n📅 ${confName}\n📆 Date: ${date}\n📍 Location: ${location}\n💰 Price: ${price} UZS\n\nStatus: ⏳ Pending Payment`,
    bookingDetails: (name, phone, confName, date, location, price, id, status) =>
      `📋 **Your Booking**\n\n👤 Name: ${name}\n📱 Phone: ${phone}\nStatus: ${status}\n\n📅 ${confName}\n📆 Date: ${date}\n📍 Location: ${location}\n💰 Price: ${price} UZS\n\n🆔 Booking ID: #${id}`,
    bookingNotFound: `You don't have any bookings yet. Use /book to create one!`,
    bookingCancelled: `✅ Your booking has been cancelled. Use /book to create a new one.`,
    help: `🤖 Available Commands:\n\n/start - Start the bot\n/book - Book a conference ticket\n/mybooking - View your booking\n/cancel - Cancel your booking\n/language - Change language\n/help - Show this help message`,
    invoiceTitle: (name) => `${name} - Conference Ticket`,
    invoiceDescription: (name, date, location, id) =>
      `Conference Ticket for ${name}\n\n📆 Date: ${date}\n📍 Location: ${location}\n🎫 Booking ID: #${id}`,
    paymentSuccess: `🎉 **Payment Successful!**\n\nYour booking has been confirmed.\n\nUse /mybooking to view your booking details.`,
    paymentError: `❌ Failed to create payment invoice. Please try again later.`,
    phoneRequest: (fullName) =>
      `📝 Great! I'll use your Telegram profile:\n\n👤 Name: ${fullName}\n\n📱 Please share your phone number by clicking the button below or typing it manually:`,
    invalidPhone: `❌ Please enter a valid phone number (e.g., +998901234567) or use the "Share My Contact" button.`,
    profileNameTooShort: `⚠️ Your Telegram profile name is too short. Please update your Telegram profile name and try again.`,
    cancelOption: `❌ Cancel`,
    useCommands: (commands) => `Use ${commands} to view details or /cancel to cancel.`,
    statusPending: `⏳ Pending`,
    statusConfirmed: `✅ Confirmed`,
    pendingPayment: `⏳ Pending Payment`,
    confirmBooking: `Please complete the payment to confirm your booking.`,
    selectLanguage: `🌍 **Select Language**\n\nPlease choose your preferred language:`,
    languageChanged: (lang) => `✅ Language changed to ${lang === 'en' ? 'English' : 'Russian'}`,
  },
  ru: {
    welcome: (name, date, location, price) =>
      `👋 Добро пожаловать на ${name}!\n\n📆 Дата: ${date}\n📍 Место: ${location}\n💰 Цена: ${price} UZS\n\nГотовы забронировать билет? Используйте /book, чтобы начать!`,
    existingBooking: (name, date, location, status) =>
      `✅ У вас уже есть бронирование!\n\n📅 ${name}\n📆 Дата: ${date}\n📍 Место: ${location}\n\nСтатус: ${status}\n\nИспользуйте /mybooking для просмотра деталей или /cancel для отмены.`,
    bookingCreated: (name, phone, confName, date, location, price) =>
      `📋 **Детали вашего бронирования:**\n\n👤 Имя: ${name}\n📱 Телефон: ${phone}\n\n📅 ${confName}\n📆 Дата: ${date}\n📍 Место: ${location}\n💰 Цена: ${price} UZS\n\nСтатус: ⏳ Ожидается оплата`,
    bookingDetails: (name, phone, confName, date, location, price, id, status) =>
      `📋 **Ваше бронирование**\n\n👤 Имя: ${name}\n📱 Телефон: ${phone}\nСтатус: ${status}\n\n📅 ${confName}\n📆 Дата: ${date}\n📍 Место: ${location}\n💰 Цена: ${price} UZS\n\n🆔 ID бронирования: #${id}`,
    bookingNotFound: `У вас пока нет бронирований. Используйте /book, чтобы создать!`,
    bookingCancelled: `✅ Ваше бронирование отменено. Используйте /book, чтобы создать новое.`,
    help: `🤖 Доступные команды:\n\n/start - Запустить бота\n/book - Забронировать билет\n/mybooking - Посмотреть бронирование\n/cancel - Отменить бронирование\n/language - Изменить язык\n/help - Показать это сообщение`,
    invoiceTitle: (name) => `${name} - Билет на конференцию`,
    invoiceDescription: (name, date, location, id) =>
      `Билет на конференцию для ${name}\n\n📆 Дата: ${date}\n📍 Место: ${location}\n🎫 ID бронирования: #${id}`,
    paymentSuccess: `🎉 **Оплата успешна!**\n\nВаше бронирование подтверждено.\n\nИспользуйте /mybooking для просмотра деталей.`,
    paymentError: `❌ Не удалось создать счет на оплату. Пожалуйста, попробуйте позже.`,
    phoneRequest: (fullName) =>
      `📝 Отлично! Я использую ваш профиль Telegram:\n\n👤 Имя: ${fullName}\n\n📱 Пожалуйста, поделитесь номером телефона, нажав кнопку ниже или введя его вручную:`,
    invalidPhone: `❌ Пожалуйста, введите действительный номер телефона (например, +998901234567) или используйте кнопку "Поделиться контактом".`,
    profileNameTooShort: `⚠️ Имя в вашем профиле Telegram слишком короткое. Пожалуйста, обновите имя профиля и попробуйте снова.`,
    cancelOption: `❌ Отмена`,
    useCommands: (commands) => `Используйте ${commands} для просмотра деталей или /cancel для отмены.`,
    statusPending: `⏳ В ожидании`,
    statusConfirmed: `✅ Подтверждено`,
    pendingPayment: `⏳ Ожидается оплата`,
    confirmBooking: `Пожалуйста, завершите оплату, чтобы подтвердить бронирование.`,
    selectLanguage: `🌍 **Выберите язык**\n\nПожалуйста, выберите предпочитаемый язык:`,
    languageChanged: (lang) => `✅ Язык изменен на ${lang === 'en' ? 'Английский' : 'Русский'}`,
  },
};

export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}

export function detectLanguage(userLangCode?: string): Language {
  // Detect from Telegram language code
  if (userLangCode?.startsWith('ru')) {
    return 'ru';
  }
  return 'en';
}
