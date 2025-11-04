# Telegram Conference Booking Bot - Simple Version

A simple Telegram bot for booking conference tickets. We'll add payment integration step by step.

## Step 1: Basic Bot with Bookings ✅

This is a minimal working version that:
- Takes bookings through Telegram
- Stores them in SQLite database
- Validates user input (name, email, phone)
- Shows booking status

## Quick Start

### 1. Get Your Telegram Bot Token

1. Open Telegram and find [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Copy the bot token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Bot

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your bot token:

```env
TELEGRAM_BOT_TOKEN=your_bot_token_here

CONFERENCE_NAME=My Conference 2024
CONFERENCE_DATE=2024-12-15
CONFERENCE_LOCATION=Tashkent, Uzbekistan
TICKET_PRICE=100000
```

### 4. Run the Bot

Development mode (with auto-reload):
```bash
npm run dev
```

Or build and run:
```bash
npm run build
npm start
```

## Testing the Bot

1. **Find your bot** on Telegram (use the username you created with BotFather)

2. **Start a conversation**:
   ```
   /start
   ```

3. **Book a ticket**:
   ```
   /book
   ```

4. **Follow the prompts**:
   - Enter your full name
   - Enter your email
   - Enter your phone number

5. **View your booking**:
   ```
   /mybooking
   ```

6. **Cancel if needed**:
   ```
   /cancel
   ```

## Bot Commands

- `/start` - Welcome message and conference info
- `/book` - Start booking a ticket
- `/mybooking` - View your current booking
- `/cancel` - Cancel your booking
- `/help` - Show all commands

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

## What's Working Now

✅ Telegram bot responds to commands
✅ User can book a ticket by providing:
   - Full name
   - Email address
   - Phone number
✅ Bookings are stored in SQLite database
✅ User can view their booking
✅ User can cancel their booking
✅ Input validation (email format, phone format, etc.)
✅ One booking per user limit

## What's Next

Once this basic version is working, we'll add:

### Step 2: Payme.uz Payment (Coming Next)
- Generate payment link
- Handle payment webhooks
- Update booking status after payment

### Step 3: Click.uz Payment (After Payme)
- Generate payment link
- Handle payment webhooks
- Let user choose between Payme and Click

## Checking the Database

You can view all bookings directly in the database:

```bash
sqlite3 bookings.db

# View all bookings
SELECT * FROM bookings;

# Exit
.quit
```

## Troubleshooting

### Bot doesn't respond
- Check your bot token is correct in `.env`
- Make sure you used the exact token from BotFather
- Check the bot is running (no errors in terminal)

### Can't create booking
- Check database file permissions
- Make sure SQLite database can be created in the current directory

### "Command not found" errors
- Run `npm install` first
- Make sure Node.js is installed (run `node --version`)

## Questions?

Test the basic bot first! Once it's working, we'll add payments step by step.

Next step: Let me know when this basic version works, and we'll add Payme integration! 🚀
