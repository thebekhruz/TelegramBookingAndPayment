# Telegram Conference Booking Bot

A clean and professional Telegram bot for booking conference tickets with integrated payment processing through Payme.uz and Click.uz.

## Features

- **Telegram Bot Integration**: User-friendly booking flow through Telegram
- **Dual Payment Gateways**: Support for both Payme.uz and Click.uz
- **SQLite Database**: Lightweight database for storing bookings and payments
- **Comprehensive Tests**: Full test coverage for payment flows
- **TypeScript**: Type-safe codebase
- **Webhook Support**: Handles payment callbacks from both providers

## Project Structure

```
TelegramBookingAndPayment/
├── src/
│   ├── bot/
│   │   └── bot.ts                  # Telegram bot implementation
│   ├── config/
│   │   └── config.ts               # Configuration management
│   ├── database/
│   │   ├── schema.ts               # Database schema
│   │   ├── bookingService.ts       # Booking/payment database operations
│   │   └── __tests__/              # Database tests
│   ├── payments/
│   │   ├── payme.ts                # Payme.uz integration
│   │   ├── click.ts                # Click.uz integration
│   │   └── __tests__/              # Payment tests
│   ├── server/
│   │   ├── webhooks.ts             # Payment webhook handlers
│   │   └── __tests__/              # Webhook tests
│   └── index.ts                    # Application entry point
├── dist/                           # Compiled JavaScript (generated)
├── coverage/                       # Test coverage reports (generated)
├── package.json
├── tsconfig.json
├── jest.config.js
└── .env                            # Environment variables (create from .env.example)
```

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))
- Payme.uz merchant credentials
- Click.uz merchant credentials
- A public domain or ngrok for webhooks (in production)

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd TelegramBookingAndPayment
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables** in `.env`:
   ```env
   # Telegram Bot Configuration
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

   # Conference Configuration
   CONFERENCE_NAME=Tech Conference 2024
   CONFERENCE_DATE=2024-12-15
   CONFERENCE_LOCATION=Tashkent, Uzbekistan
   TICKET_PRICE=100000        # Price in tiyin (1000 UZS = 100000 tiyin)

   # Payme.uz Configuration
   PAYME_MERCHANT_ID=your_payme_merchant_id
   PAYME_SECRET_KEY=your_payme_secret_key
   PAYME_ENDPOINT=https://checkout.paycom.uz

   # Click.uz Configuration
   CLICK_MERCHANT_ID=your_click_merchant_id
   CLICK_SERVICE_ID=your_click_service_id
   CLICK_SECRET_KEY=your_click_secret_key
   CLICK_MERCHANT_USER_ID=your_click_merchant_user_id

   # Server Configuration
   PORT=3000
   WEBHOOK_DOMAIN=https://your-domain.com

   # Database
   DATABASE_PATH=./database.sqlite
   ```

## Getting Your Credentials

### Telegram Bot Token

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow the instructions to create your bot
4. Copy the bot token provided by BotFather

### Payme.uz Credentials

1. Register at [Payme.uz Merchant Portal](https://my.paycom.uz/)
2. Create a new merchant/service
3. Obtain your Merchant ID and Secret Key
4. Configure webhook URL: `https://your-domain.com/webhooks/payme`

### Click.uz Credentials

1. Register at [Click.uz Merchant Portal](https://my.click.uz/)
2. Create a new service
3. Obtain Service ID, Merchant ID, Merchant User ID, and Secret Key
4. Configure webhook URLs:
   - Prepare: `https://your-domain.com/webhooks/click/prepare`
   - Complete: `https://your-domain.com/webhooks/click/complete`

## Running the Application

### Development Mode

```bash
npm run dev
```

This will start the bot in development mode with hot reload.

### Production Mode

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start the application**:
   ```bash
   npm start
   ```

## Testing

The project includes comprehensive tests for all payment flows and database operations.

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Generate Coverage Report

```bash
npm test -- --coverage
```

Coverage reports will be generated in the `coverage/` directory.

### Test Coverage

The test suite includes:

- **Payme.uz Payment Tests**:
  - Payment URL generation
  - Authorization verification
  - CheckPerformTransaction
  - CreateTransaction
  - PerformTransaction
  - CancelTransaction
  - CheckTransaction

- **Click.uz Payment Tests**:
  - Payment URL generation
  - Signature verification
  - Prepare transaction
  - Complete transaction
  - Error handling

- **Booking Service Tests**:
  - Create booking
  - Retrieve bookings
  - Update payment status
  - Payment record management
  - Database integrity

- **Webhook Integration Tests**:
  - Payme webhook handling
  - Click webhook handling
  - Authorization and signature validation
  - End-to-end payment flow

## Testing Payment Integration Before Publishing

Before publishing your bot, you should test the payment integration:

### 1. Test with Payment Provider Sandbox (Recommended)

Both Payme.uz and Click.uz provide sandbox/test environments:

- **Payme.uz**: Contact their support to get sandbox credentials
- **Click.uz**: Request test environment access

Update your `.env` file with sandbox credentials and test the full payment flow.

### 2. Run Automated Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm test payme.test
npm test click.test
npm test webhooks.test
```

### 3. Manual Testing with Ngrok

For local testing with real webhooks:

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   ```

2. **Start your application**:
   ```bash
   npm run dev
   ```

3. **Start ngrok** (in another terminal):
   ```bash
   ngrok http 3000
   ```

4. **Update environment variables**:
   ```env
   WEBHOOK_DOMAIN=https://your-ngrok-url.ngrok.io
   ```

5. **Configure webhook URLs** in Payme and Click merchant portals

6. **Test the bot**:
   - Start a conversation with your bot on Telegram
   - Use `/start` to begin
   - Use `/book` to create a booking
   - Select a payment method
   - Complete the payment in the test environment
   - Verify the payment status is updated in the bot

### 4. Verify Webhook Responses

Check your terminal/logs for webhook requests:

```bash
# You should see logs like:
# POST /webhooks/payme
# POST /webhooks/click/prepare
# POST /webhooks/click/complete
```

## Bot Commands

- `/start` - Start the bot and view conference information
- `/book` - Book a conference ticket
- `/mybooking` - View your booking status
- `/cancel` - Cancel your pending booking
- `/help` - Show available commands

## Booking Flow

1. User starts the bot with `/start`
2. User initiates booking with `/book`
3. Bot collects user information:
   - Full name
   - Email address
   - Phone number
4. Bot displays booking summary and payment options
5. User selects payment method (Payme or Click)
6. User completes payment through external payment page
7. Payment provider sends webhook to confirm payment
8. Bot updates booking status and notifies user
9. User can check status with `/mybooking`

## Deployment

### Using a VPS (Recommended for Production)

1. **Setup your VPS** (Ubuntu 20.04+ recommended)

2. **Install Node.js**:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd TelegramBookingAndPayment
   npm install
   npm run build
   ```

4. **Setup environment variables**:
   ```bash
   nano .env
   # Fill in your production credentials
   ```

5. **Use PM2 for process management**:
   ```bash
   sudo npm install -g pm2
   pm2 start dist/index.js --name conference-bot
   pm2 startup
   pm2 save
   ```

6. **Setup Nginx as reverse proxy** (optional but recommended):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

7. **Setup SSL with Let's Encrypt**:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## Monitoring

### Check Bot Status

```bash
pm2 status
pm2 logs conference-bot
```

### Health Check Endpoint

```bash
curl https://your-domain.com/health
```

### View Bookings (Database)

```bash
sqlite3 database.sqlite
sqlite> SELECT * FROM bookings;
sqlite> SELECT * FROM payments;
```

## Troubleshooting

### Bot Not Responding

1. Check if the bot is running: `pm2 status`
2. Check logs: `pm2 logs conference-bot`
3. Verify bot token is correct
4. Ensure bot is not already running elsewhere

### Payments Not Working

1. Verify webhook URLs are correctly configured in merchant portals
2. Check webhook logs for errors
3. Verify signature/authorization keys are correct
4. Ensure your domain has valid SSL certificate
5. Test with sandbox credentials first

### Database Errors

1. Check database file permissions
2. Verify DATABASE_PATH in .env
3. Backup and recreate database if corrupted:
   ```bash
   mv database.sqlite database.sqlite.backup
   npm start  # Will create new database
   ```

## Security Considerations

- **Never commit `.env` file** to version control
- **Use HTTPS** for webhook endpoints in production
- **Rotate secrets regularly**
- **Validate all webhook signatures** (already implemented)
- **Limit rate of booking requests** (consider adding rate limiting)
- **Backup database regularly**

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## License

MIT License - feel free to use this project for your conference!

## Support

For issues and questions:
- Check the troubleshooting section
- Review the test files for usage examples
- Check Payme.uz and Click.uz documentation

## Acknowledgments

- [Telegraf](https://telegraf.js.org/) - Telegram Bot Framework
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite Database
- [Payme.uz](https://paycom.uz/) - Payment Gateway
- [Click.uz](https://click.uz/) - Payment Gateway
