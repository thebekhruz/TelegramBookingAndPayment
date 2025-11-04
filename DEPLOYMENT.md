# Deployment Guide

## Why You Need a Server

A Telegram bot needs to be running **24/7** to:
- Receive and respond to messages instantly
- Handle webhooks (for payment callbacks)
- Process bookings continuously

If you close your computer, the bot stops working. That's why you need a hosted server.

## Deployment Options

### Option 1: Railway (Easiest - Recommended for Beginners)

**Pros**: Very easy, free tier available, auto-deploys from GitHub

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app)
3. Sign up with GitHub
4. Click "New Project" → "Deploy from GitHub repo"
5. Select your repository
6. Add environment variables:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   CONFERENCE_NAME=Conference 2025
   CONFERENCE_DATE=2025-11-29
   CONFERENCE_LOCATION=Tashkent, Oxbridge International School, Uzbekistan
   TICKET_PRICE=2000
   DATABASE_PATH=/tmp/bookings.db
   ```
7. Railway will auto-detect Node.js and deploy
8. Your bot will be live! 🚀

**Free Tier**: $5 credit/month (usually enough for small bots)

---

### Option 2: Render (Free Tier Available)

**Pros**: Free tier, simple setup

1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new "Web Service"
4. Connect GitHub repo
5. Settings:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Add environment variables (same as Railway)
7. Deploy!

**Free Tier**: 750 hours/month (enough for 24/7)

---

### Option 3: DigitalOcean Droplet (VPS)

**Pros**: Full control, $4-6/month

1. Create account at [digitalocean.com](https://digitalocean.com)
2. Create a Droplet ($4/month minimum)
3. SSH into server:
   ```bash
   ssh root@your_server_ip
   ```
4. Install Node.js:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
   apt-get install -y nodejs
   ```
5. Clone your repository
6. Install dependencies: `npm install`
7. Set up environment variables
8. Run with PM2 (keeps bot running):
   ```bash
   npm install -g pm2
   npm run build
   pm2 start dist/index.js --name telegram-bot
   pm2 save
   pm2 startup
   ```

---

### Option 4: Heroku

**Pros**: Well-known platform

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-bot-name`
4. Set environment variables:
   ```bash
   heroku config:set TELEGRAM_BOT_TOKEN=your_token
   heroku config:set CONFERENCE_NAME="Conference 2025"
   # ... etc
   ```
5. Deploy: `git push heroku main`
6. Run: `heroku ps:scale web=1`

**Note**: Heroku free tier ended, now requires paid plans (~$7/month)

---

### Option 5: Keep Running Locally (For Testing Only)

**Not recommended for production**, but works for testing:

1. Run on your computer: `npm run dev`
2. Use a tool like **ngrok** to expose localhost:
   ```bash
   npx ngrok http 3000
   ```
3. Keep your computer on 24/7 (not ideal)

---

## Quick Setup Script for VPS (DigitalOcean/Linode)

Save this as `deploy.sh`:

```bash
#!/bin/bash

# Update system
apt-get update
apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Clone your repo (or upload files)
# git clone your_repo_url
# cd your_repo_folder

# Install dependencies
npm install
npm run build

# Create .env file with your config
nano .env

# Start with PM2
pm2 start dist/index.js --name telegram-bot
pm2 save
pm2 startup
```

---

## Important Notes

### Database Persistence

- **Railway/Render**: Uses ephemeral storage (data may reset)
  - Consider using a persistent database service (Railway Postgres, Render Postgres)
  - Or use external SQLite file storage service
  
- **VPS**: Files persist, but backup regularly!

### Monitoring

Use PM2 (for VPS) to monitor:
```bash
pm2 status          # Check if running
pm2 logs            # View logs
pm2 restart bot     # Restart bot
```

### Environment Variables

Always set these in your hosting platform:
- `TELEGRAM_BOT_TOKEN` (required)
- `CONFERENCE_NAME`
- `CONFERENCE_DATE`
- `CONFERENCE_LOCATION`
- `TICKET_PRICE`
- `DATABASE_PATH` (optional, defaults to ./bookings.db)

---

## Recommendation

For beginners: **Railway** or **Render** (easiest setup)
For more control: **DigitalOcean Droplet** with PM2
For enterprise: **AWS/Azure** with proper infrastructure

## Need Help?

Once you choose a platform, I can help you set it up step-by-step! Just let me know which one you prefer.
