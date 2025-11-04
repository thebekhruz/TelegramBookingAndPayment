# Telegram Conference Booking Bot

A Telegram bot for booking conference tickets with integrated payment processing via Telegram's native payment system (Click.uz & Payme.uz).

## Features

✅ **Booking System**
- Simple booking flow (name + phone number)
- One booking per user
- View and cancel bookings
- Input validation

✅ **Payment Integration**
- Telegram native invoices
- Supports Click.uz and Payme.uz
- Automatic payment confirmation
- Secure payment processing

✅ **Notifications**
- Customer confirmation messages
- Admin notifications for all confirmed bookings

✅ **Database**
- SQLite database for bookings
- Persistent storage

## Quick Start

### 1. Get Your Telegram Bot Token

1. Open Telegram and find [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token

### 2. Setup Payment Providers

1. In BotFather, send `/mybots`
2. Select your bot → "Payments"
3. Add Click.uz and/or Payme.uz payment providers
4. Follow BotFather's instructions to connect your merchant account

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure the Bot

Create a `.env` file:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
ADMIN_USER_ID=your_telegram_user_id

CONFERENCE_NAME=Conference 2025
CONFERENCE_DATE=2025-11-29
CONFERENCE_LOCATION=Tashkent, Uzbekistan
TICKET_PRICE=200000
```

**Important Notes:**
- `TICKET_PRICE` is in **tiyins** (1 UZS = 100 tiyins)
- Example: 2000 UZS = 200000 tiyins
- Get your `ADMIN_USER_ID` by messaging `@userinfobot` on Telegram

### 5. Run the Bot

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Bot Commands

- `/start` - Welcome message and conference info
- `/book` - Create a new booking
- `/mybooking` - View your current booking
- `/cancel` - Cancel your booking
- `/help` - Show all commands

## User Flow

1. User sends `/book`
2. Bot asks for full name
3. Bot asks for phone number
4. Booking created with status: `pending`
5. Payment invoice sent via Telegram
6. User pays using Click.uz or Payme.uz
7. Payment confirmed automatically
8. Booking status updated to `confirmed`
9. Customer and admin receive notifications

## Project Structure

```
TelegramBookingAndPayment/
├── src/
│   ├── index.ts       # Main entry point
│   ├── config.ts      # Configuration
│   ├── database.ts    # Database & booking service
│   └── bot.ts         # Telegram bot logic
├── .env               # Your configuration (don't commit!)
├── .env.example       # Example configuration
├── package.json
└── tsconfig.json
```

## Documentation

- **[TELEGRAM_PAYMENT_SETUP.md](TELEGRAM_PAYMENT_SETUP.md)** - Payment setup guide
- **[ADMIN_SETUP.md](ADMIN_SETUP.md)** - Admin notification setup
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide

## Checking the Database

View all bookings:

```bash
sqlite3 database.sqlite

# View all bookings
SELECT * FROM bookings;

# Exit
.quit
```

## Troubleshooting

### Bot doesn't respond
- Check your bot token is correct in `.env`
- Verify bot is running (check terminal for errors)
- Make sure you're messaging the correct bot

### Invoice not appearing
- Verify payment providers are configured in BotFather
- Ensure `TICKET_PRICE` is in tiyins (not UZS)
- Check bot logs for errors

### Payment not confirming
- Check bot logs for errors
- Verify `successful_payment` handler is working
- Ensure database is accessible

### Can't create booking
- Check database file permissions
- Ensure SQLite database can be created in current directory

## Requirements

- Node.js 18+ 
- Telegram account
- Click.uz or Payme.uz merchant account (for payments)

## License

MIT
