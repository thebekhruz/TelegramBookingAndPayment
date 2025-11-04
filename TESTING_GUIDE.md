# Payment Testing Guide

This guide will help you test the payment integration before publishing your Telegram bot.

## Quick Start Testing

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Automated Tests

The easiest way to verify payment logic is working correctly:

```bash
npm test
```

This will run all tests including:
- ✅ Payme.uz payment flow (CheckPerformTransaction, CreateTransaction, PerformTransaction, etc.)
- ✅ Click.uz payment flow (Prepare, Complete, signature verification)
- ✅ Database operations (bookings, payments, status updates)
- ✅ Webhook handlers (full end-to-end payment simulation)

### Expected Output

```
 PASS  src/payments/__tests__/payme.test.ts
 PASS  src/payments/__tests__/click.test.ts
 PASS  src/database/__tests__/bookingService.test.ts
 PASS  src/server/__tests__/webhooks.test.ts

Test Suites: 4 passed, 4 total
Tests:       XX passed, XX total
```

## Testing with Real Payment Providers

### Step 1: Get Sandbox/Test Credentials

#### Payme.uz Test Environment
1. Contact Payme support: support@paycom.uz
2. Request sandbox merchant account
3. They will provide:
   - Test Merchant ID
   - Test Secret Key
   - Sandbox endpoint (usually same as production)

#### Click.uz Test Environment
1. Contact Click support or your account manager
2. Request test service credentials
3. They will provide:
   - Test Service ID
   - Test Merchant ID
   - Test Secret Key
   - Test cards for payment simulation

### Step 2: Configure Test Environment

Create a `.env.test` file:

```env
TELEGRAM_BOT_TOKEN=your_test_bot_token

CONFERENCE_NAME=Test Conference 2024
CONFERENCE_DATE=2024-12-15
CONFERENCE_LOCATION=Tashkent, Uzbekistan
TICKET_PRICE=100000

# Payme TEST credentials
PAYME_MERCHANT_ID=your_test_merchant_id
PAYME_SECRET_KEY=your_test_secret_key
PAYME_ENDPOINT=https://checkout.test.paycom.uz

# Click TEST credentials
CLICK_MERCHANT_ID=your_test_merchant_id
CLICK_SERVICE_ID=your_test_service_id
CLICK_SECRET_KEY=your_test_secret_key
CLICK_MERCHANT_USER_ID=your_test_user_id

PORT=3000
WEBHOOK_DOMAIN=https://your-ngrok-url.ngrok.io
DATABASE_PATH=./test.sqlite
```

### Step 3: Set Up Local Webhook Testing

1. **Install ngrok** (for exposing local server to internet):
   ```bash
   # Download from https://ngrok.com/ or use npm
   npm install -g ngrok
   ```

2. **Start your bot** (in terminal 1):
   ```bash
   # Copy test config
   cp .env.test .env

   # Start the bot
   npm run dev
   ```

3. **Start ngrok** (in terminal 2):
   ```bash
   ngrok http 3000
   ```

   You'll see output like:
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:3000
   ```

4. **Update webhook URLs**:
   - Copy the ngrok URL (e.g., `https://abc123.ngrok.io`)
   - Update `WEBHOOK_DOMAIN` in your `.env` file
   - Restart your bot

### Step 4: Configure Payment Provider Webhooks

#### Configure Payme Webhooks
1. Log into Payme merchant portal
2. Go to your service settings
3. Set webhook URL: `https://abc123.ngrok.io/webhooks/payme`
4. Save settings

#### Configure Click Webhooks
1. Log into Click merchant portal
2. Go to your service settings
3. Set webhook URLs:
   - **Prepare URL**: `https://abc123.ngrok.io/webhooks/click/prepare`
   - **Complete URL**: `https://abc123.ngrok.io/webhooks/click/complete`
4. Save settings

### Step 5: Manual End-to-End Testing

1. **Open Telegram** and find your test bot

2. **Start booking flow**:
   ```
   /start
   /book
   ```

3. **Enter test information**:
   - Full name: Test User
   - Email: test@example.com
   - Phone: +998901234567

4. **Select payment method** (Payme or Click)

5. **Complete payment**:
   - You'll be redirected to payment page
   - Use test card provided by payment provider
   - Complete the payment

6. **Verify webhook received**:
   - Check your terminal running the bot
   - You should see webhook request logs
   - Check ngrok dashboard: http://localhost:4040

7. **Check booking status**:
   ```
   /mybooking
   ```
   - Should show "Paid" status

## Test Scenarios Checklist

Use this checklist to ensure thorough testing:

### Basic Flow Tests
- [ ] Bot responds to `/start` command
- [ ] Bot collects user information correctly
- [ ] Bot validates email format
- [ ] Bot validates phone format
- [ ] Bot displays payment options
- [ ] Payment URLs are generated correctly

### Payme Payment Tests
- [ ] Payme payment page opens correctly
- [ ] Can complete payment with test card
- [ ] Webhook is received and processed
- [ ] Booking status updates to "paid"
- [ ] User receives confirmation message
- [ ] Cannot book twice with same user

### Click Payment Tests
- [ ] Click payment page opens correctly
- [ ] Can complete payment with test card
- [ ] Prepare webhook is received
- [ ] Complete webhook is received
- [ ] Booking status updates to "paid"
- [ ] User receives confirmation message

### Edge Cases
- [ ] Invalid booking ID returns proper error
- [ ] Already paid booking cannot be paid again
- [ ] Wrong amount is rejected
- [ ] Invalid signature is rejected
- [ ] Cancelled transactions are handled
- [ ] Database handles concurrent requests

### Error Handling
- [ ] Network timeout doesn't break the bot
- [ ] Invalid webhook data is rejected
- [ ] Malformed requests return proper errors
- [ ] Database errors are logged

## Monitoring During Tests

### Watch Bot Logs
```bash
# Terminal with bot running shows all activity
npm run dev
```

Look for:
- ✅ Webhook requests received
- ✅ Payment status updates
- ✅ Database operations
- ❌ Any error messages

### Watch Webhook Traffic
```bash
# Ngrok web interface
open http://localhost:4040
```

Shows:
- All HTTP requests to your local server
- Request/response bodies
- Timing information

### Check Database
```bash
# Open SQLite database
sqlite3 database.sqlite

# View bookings
SELECT * FROM bookings;

# View payments
SELECT * FROM payments;

# Exit
.quit
```

## Common Testing Issues

### Issue: Webhook not received

**Solutions:**
1. Check ngrok is running: `http://localhost:4040`
2. Verify webhook URLs in merchant portal
3. Check firewall isn't blocking requests
4. Ensure bot is running and listening on correct port
5. Check ngrok URL hasn't expired (free tier expires after 2 hours)

### Issue: Invalid signature error

**Solutions:**
1. Verify secret keys match exactly (no extra spaces)
2. Check if using test or production credentials consistently
3. Verify timestamp format is correct
4. Check if keys are properly encoded

### Issue: Payment stuck in pending

**Solutions:**
1. Check webhook was actually received (check logs)
2. Verify database was updated
3. Check for errors in webhook handler
4. Manually complete transaction via merchant portal
5. Check payment provider's transaction status

### Issue: Database locked error

**Solutions:**
1. Close any open database connections
2. Stop multiple instances of the bot
3. Check file permissions on database file
4. Use in-memory database for testing: `DATABASE_PATH=:memory:`

## Production Testing Checklist

Before going live:

- [ ] All automated tests pass
- [ ] Manual testing completed with sandbox
- [ ] Webhook URLs configured with production domain
- [ ] SSL certificate is valid on production domain
- [ ] Environment variables use production credentials
- [ ] Database is backed up regularly
- [ ] Error logging is set up
- [ ] Bot is running under process manager (PM2)
- [ ] Payment provider approved your integration
- [ ] Test with small real payment first

## Support Resources

### Payme.uz
- Documentation: https://developer.help.paycom.uz/
- Support: support@paycom.uz
- Technical Integration: https://developer.help.paycom.uz/initsializatsiya-platezhey/

### Click.uz
- Documentation: https://docs.click.uz/
- Merchant Portal: https://my.click.uz/
- Support: Contact through merchant portal

### Telegram Bot API
- Documentation: https://core.telegram.org/bots/api
- BotFather: https://t.me/botfather

## Getting Help

If you encounter issues:

1. **Check the logs** - Most issues show up in console output
2. **Run the tests** - `npm test` to verify core functionality
3. **Review the code** - Tests show expected behavior
4. **Check webhook requests** - Use ngrok inspector
5. **Contact payment providers** - They can see transaction status on their end

## Security Note

**Never commit real credentials!**

- Always use `.env` file (in `.gitignore`)
- Use different credentials for test and production
- Rotate secrets regularly
- Never share secret keys in support requests
- Use HTTPS for all production webhooks

---

Happy testing! 🚀
