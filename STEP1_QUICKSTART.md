# Step 1: Basic Telegram Bot - Quick Start Guide

## What We're Building (Step by Step)

✅ **Step 1** - Basic booking bot (you are here!)
⏳ **Step 2** - Add Payme.uz payment (next)
⏳ **Step 3** - Add Click.uz payment (after Payme)

## Let's Get Your Bot Running! 🚀

### 1. Create Your Telegram Bot (5 minutes)

1. Open Telegram on your phone or computer
2. Search for **@BotFather**
3. Start a chat and send: `/newbot`
4. Follow the instructions:
   - Give your bot a name (e.g., "My Conference Bot")
   - Give it a username (must end with 'bot', e.g., "myconference_bot")
5. **Copy the token** - looks like this: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

### 2. Setup the Project

```bash
# 1. Install dependencies
npm install

# 2. Create your configuration file
cp .env.example .env

# 3. Edit .env file and add your bot token
nano .env
# or
code .env
# or just open it in any text editor
```

In the `.env` file, paste your bot token:
```env
TELEGRAM_BOT_TOKEN=paste_your_token_here

CONFERENCE_NAME=Tech Conference 2024
CONFERENCE_DATE=2024-12-15
CONFERENCE_LOCATION=Tashkent, Uzbekistan
TICKET_PRICE=100000
```

### 3. Run the Bot

```bash
npm run dev
```

You should see:
```
🚀 Starting Telegram Conference Booking Bot...

📦 Initializing database...
✅ Database ready!

🤖 Starting Telegram bot...
✅ Bot is running!

📋 Conference Details:
   Name: Tech Conference 2024
   Date: 2024-12-15
   Location: Tashkent, Uzbekistan
   Price: 1000 UZS

💬 Bot is ready to accept bookings!
```

### 4. Test Your Bot

1. **Find your bot** on Telegram (search for the username you created)

2. **Send `/start`** - You should get a welcome message

3. **Send `/book`** - Start the booking process

4. **Enter your info**:
   - Type your full name (e.g., "John Doe")
   - Type your email (e.g., "john@example.com")
   - Type your phone (e.g., "+998901234567")

5. **Success!** You should see: ✅ Booking created successfully!

6. **Try `/mybooking`** - View your booking

7. **Try `/cancel`** - Cancel and book again

## What's Working Now

✅ Bot responds to commands
✅ Takes user information (name, email, phone)
✅ Validates input (proper email and phone format)
✅ Saves bookings to SQLite database
✅ Shows booking status
✅ Allows cancellation
✅ One booking per user (can't book twice)

## Check the Database

Want to see the bookings in the database?

```bash
sqlite3 bookings.db
```

Then run:
```sql
SELECT * FROM bookings;
```

Exit with: `.quit`

## Common Issues

### "Bot doesn't respond"
- Make sure you copied the ENTIRE token from BotFather
- Check the bot is running (terminal should show "Bot is running!")
- Make sure you're messaging the correct bot

### "npm: command not found"
- Install Node.js first: https://nodejs.org/

### "Permission denied" on database
- Make sure you can write files in the current directory
- Try running with: `sudo npm run dev` (not recommended for production)

## What's Next?

Once this works perfectly, reply with "Step 1 works!" and we'll add **Payme.uz payment** integration.

### What We'll Add in Step 2:
- After user books, they'll get a payment link
- Payment will be processed through Payme.uz
- Webhook will confirm payment automatically
- Booking status will update to "paid"

But first, **test this basic version thoroughly!** Make sure:
- ✅ You can start the bot
- ✅ You can book a ticket
- ✅ You can view your booking
- ✅ You can cancel it
- ✅ The data is saved (check database)

Ready to test? Go! 🚀
