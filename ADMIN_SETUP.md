# Admin Notification Setup

## How to Set Up Admin Notifications

When a booking is confirmed (after payment), the bot will automatically send a confirmation message to a specific admin user with all booking details.

### Step 1: Get Your Telegram User ID

You need to find your Telegram User ID to receive notifications. Here are a few ways:

**Method 1: Use @userinfobot**
1. Open Telegram
2. Search for `@userinfobot`
3. Start a conversation and send `/start`
4. The bot will reply with your User ID (a number like `123456789`)

**Method 2: Use @RawDataBot**
1. Open Telegram
2. Search for `@RawDataBot`
3. Start a conversation
4. It will show your ID in the "id" field

**Method 3: Forward a message to @getidsbot**
1. Forward any message from yourself to `@getidsbot`
2. It will show your User ID

### Step 2: Add to .env File

Open your `.env` file and add:

```env
ADMIN_USER_ID=your_user_id_here
```

For example:
```env
ADMIN_USER_ID=123456789
```

### Step 3: Restart the Bot

After adding the `ADMIN_USER_ID`, restart your bot:

```bash
npm run dev
```

You should see:
```
👑 Admin notifications enabled for user ID: 123456789
```

### How It Works

When a booking is confirmed (after successful payment):

1. **Customer receives**: A confirmation message that their payment was received and booking is confirmed
2. **Admin receives**: A detailed notification with:
   - Customer name, username, email, phone
   - Conference details
   - Booking ID and date
   - Payment status

### Testing

You can test the notification system:

1. Create a booking with `/book`
2. As the admin user, use `/confirm` to manually confirm the booking
3. You should receive:
   - A confirmation message (as the customer)
   - An admin notification (as the admin)

### Payment Integration

When you integrate payment webhooks (Payme.uz, Click.uz), you'll call:

```typescript
import { botInstance } from './src/index';

// After payment is confirmed
await botInstance.confirmBookingAndNotify(bookingId);
```

This will automatically:
- Update booking status to 'confirmed'
- Send confirmation to customer
- Send notification to admin
