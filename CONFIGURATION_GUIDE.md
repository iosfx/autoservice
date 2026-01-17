# AutoService - Complete Configuration Guide

This guide walks you through setting up all required accounts, API keys, and configuration for the AutoService Retention system.

---

## 📋 Overview

**Required Services:**
1. **Supabase** (PostgreSQL Database) - FREE tier available
2. **Google Cloud Console** (Google Calendar API) - FREE
3. **Optional**: WhatsApp Business API / SMS Provider - For production messaging

**Local Development:**
- Uses mock messaging provider (no API keys needed)
- All features work locally without external messaging services

---

## 🗂️ Table of Contents

1. [Database Setup (Supabase)](#1-database-setup-supabase)
2. [Google Calendar API Setup](#2-google-calendar-api-setup)
3. [Backend Configuration](#3-backend-configuration)
4. [Frontend Configuration](#4-frontend-configuration)
5. [Running the Application](#5-running-the-application)
6. [Optional: Production Messaging](#6-optional-production-messaging)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Database Setup (Supabase)

### Create Supabase Account

1. Go to **https://supabase.com/**
2. Click **"Start your project"**
3. Sign up with GitHub (recommended) or email
4. Verify your email

### Create a New Project

1. Click **"New Project"**
2. Fill in:
   - **Name**: `autoservice-retention` (or your choice)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to you (e.g., `US East` or `EU Central`)
   - **Pricing Plan**: Free tier is sufficient for development

3. Click **"Create new project"**
4. Wait 2-3 minutes for database provisioning

### Get Database Connection String

1. In your Supabase project, go to **Settings** (gear icon) → **Database**
2. Scroll to **Connection string** section
3. Select **"URI"** tab
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

5. **IMPORTANT**: Replace `[YOUR-PASSWORD]` with the actual database password you created

**Save this connection string** - you'll need it for `DATABASE_URL` in `.env`

---

## 2. Google Calendar API Setup

### Create Google Cloud Project

1. Go to **https://console.cloud.google.com/**
2. Sign in with your Google account
3. Click **"Select a project"** dropdown → **"New Project"**
4. Fill in:
   - **Project name**: `AutoService Retention`
   - **Organization**: Leave as "No organization" (or your org)
5. Click **"Create"**

### Enable Google Calendar API

1. Make sure your new project is selected (top dropdown)
2. Go to **"APIs & Services"** → **"Library"** (left sidebar)
3. Search for **"Google Calendar API"**
4. Click on it → Click **"Enable"**

### Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Configure Consent Screen"**
   - Choose **"External"** → Click **"Create"**
   - Fill in required fields:
     - **App name**: `AutoService Retention`
     - **User support email**: Your email
     - **Developer contact**: Your email
   - Click **"Save and Continue"**
   - Skip **"Scopes"** → Click **"Save and Continue"**
   - Skip **"Test users"** for now
   - Click **"Back to Dashboard"**

3. Go back to **"Credentials"** tab
4. Click **"+ Create Credentials"** → **"OAuth client ID"**
5. Fill in:
   - **Application type**: `Web application`
   - **Name**: `AutoService Backend`
   - **Authorized redirect URIs**: Click **"+ Add URI"** and enter:
     ```
     http://localhost:3001/auth/google-calendar/callback
     ```
   - For production, also add your deployed backend URL:
     ```
     https://your-backend-url.com/auth/google-calendar/callback
     ```

6. Click **"Create"**

### Save Your Credentials

A popup will show:
- **Client ID**: Looks like `123456789-abc.apps.googleusercontent.com`
- **Client secret**: Looks like `GOCSPX-abc123xyz`

**Copy both and save them** - you'll need them for `.env`

⚠️ **Security Note**: Never commit these to Git! They're already in `.gitignore`

---

## 3. Backend Configuration

### Step 1: Copy Environment File

```bash
cd backend
cp .env.example .env
```

### Step 2: Edit `.env` File

Open `backend/.env` in your editor and fill in:

```bash
# ==========================================
# SERVER CONFIGURATION
# ==========================================
PORT=3001
NODE_ENV=development

# ==========================================
# DATABASE (from Supabase)
# ==========================================
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.xxxxx.supabase.co:5432/postgres
# ☝️ Paste your Supabase connection string here

# ==========================================
# JWT CONFIGURATION
# ==========================================
JWT_SECRET=change-this-to-a-long-random-string-min-32-chars
# ☝️ Generate a secure random string
#    You can use: openssl rand -base64 32
#    Or go to: https://randomkeygen.com/

# ==========================================
# GOOGLE CALENDAR OAuth (from Google Cloud Console)
# ==========================================
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
# ☝️ Paste your Google OAuth Client ID

GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxxx
# ☝️ Paste your Google OAuth Client Secret

GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google-calendar/callback
# ☝️ Keep this as-is for local development
#    For production: https://your-backend.com/auth/google-calendar/callback

# ==========================================
# MESSAGING CONFIGURATION
# ==========================================
MESSAGING_PROVIDER=mock
# ☝️ Keep as 'mock' for local development
#    Change to 'twilio' or other provider for production

# Mock Messaging Settings (for local testing)
MOCK_MESSAGE_FAIL_RATE=0
# ☝️ Set to 0.1 to simulate 10% failure rate for testing

MOCK_MESSAGE_FAIL_PHONE_SUFFIX=000
# ☝️ Phone numbers ending with '000' will fail (for testing)

# ==========================================
# PRODUCTION MESSAGING (Optional - ignore for now)
# ==========================================
# WhatsApp Business API
WHATSAPP_API_URL=https://api.whatsapp.com
WHATSAPP_API_KEY=your-whatsapp-api-key

# SMS Provider (e.g., Twilio, Vonage)
SMS_PROVIDER_URL=https://api.twilio.com
SMS_PROVIDER_API_KEY=your-sms-api-key

# ==========================================
# RETENTION CONFIGURATION
# ==========================================
RETENTION_LOOKAHEAD_DAYS=14
# ☝️ How many days ahead to look when generating retention messages

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL=info
# ☝️ Options: debug, info, warn, error
```

### Step 3: Generate JWT Secret (if needed)

**On Mac/Linux:**
```bash
openssl rand -base64 32
```

**On Windows (PowerShell):**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

**Or use an online generator:**
- https://randomkeygen.com/ (use the "Fort Knox" password)

Copy the result and paste it as `JWT_SECRET` in `.env`

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations (creates all tables)
npx prisma migrate dev
```

You should see output like:
```
✔ Name of migration … init
✔ Applying migration `20240105_init`
✔ Database schema created successfully
```

### Step 6: Start Backend

```bash
npm run dev
```

You should see:
```
Server listening at http://0.0.0.0:3001
```

✅ **Backend is now running!**

---

## 4. Frontend Configuration

### Step 1: Copy Environment File

```bash
cd admin
cp .env.example .env
```

### Step 2: Edit `.env` File

Open `admin/.env` in your editor:

```bash
# ==========================================
# API BASE URL
# ==========================================
VITE_API_BASE_URL=http://localhost:3001
# ☝️ For local development, keep as-is
#    For production: https://your-backend-url.com
```

That's it! The frontend only needs to know where the backend is.

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Start Frontend

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

✅ **Frontend is now running!**

---

## 5. Running the Application

### Complete Local Setup

1. **Terminal 1 - Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Terminal 2 - Frontend:**
   ```bash
   cd admin
   npm run dev
   ```

3. **Open Browser:**
   - Go to **http://localhost:5173**
   - You'll see the login screen

### First Time Setup - Create Admin Account

Since there are no users yet, you need to register:

**Option 1: Use the API directly**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourgarage.com",
    "password": "YourSecurePassword123!",
    "name": "Admin User",
    "garageName": "My Auto Garage",
    "timezone": "America/New_York"
  }'
```

**Option 2: Use Prisma Studio**
```bash
cd backend
npx prisma studio
```
This opens a visual database editor at http://localhost:5555

Then login with these credentials in the web dashboard!

### Verify Everything Works

1. **Login** at http://localhost:5173/login
2. **Navigate** through pages:
   - Inbox (should show empty summary)
   - Clients (should be empty)
   - Templates (click "Seed Defaults" to create Romanian templates)
   - Messages (should be empty)
   - Settings (shows basic info)

3. **Check Console Logs:**
   - Browser DevTools → Console (should see `[API]` logs)
   - Backend terminal (should see Fastify request logs)

---

## 6. Optional: Production Messaging

### For Local Development
**You don't need real messaging APIs!** The mock provider simulates message sending.

### For Production - WhatsApp Business API

**Recommended Provider: Twilio**

1. Go to **https://www.twilio.com/**
2. Sign up for an account (free trial includes credits)
3. Get your **Account SID** and **Auth Token**
4. Set up WhatsApp Business:
   - Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
   - Follow the setup wizard
   - Get your **WhatsApp phone number**

5. Update `backend/.env`:
   ```bash
   MESSAGING_PROVIDER=twilio
   WHATSAPP_API_URL=https://api.twilio.com/2010-04-01
   WHATSAPP_API_KEY=your_account_sid:your_auth_token
   ```

**Note:** You'll need to implement `TwilioMessagingProvider.ts` (currently only `MockMessagingProvider` exists)

### For Production - SMS

Same as WhatsApp - use Twilio or another provider like Vonage, AWS SNS, etc.

---

## 7. Troubleshooting

### Backend Won't Start

**Error: `DATABASE_URL` not found**
- Check that `backend/.env` exists
- Verify `DATABASE_URL` is set correctly
- Make sure there are no spaces around `=`

**Error: Can't connect to database**
- Verify your Supabase project is running
- Check the database password is correct in `DATABASE_URL`
- Try pinging the database: `psql <DATABASE_URL>`

**Error: Prisma schema issues**
```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

### Frontend Won't Start

**Error: `VITE_API_BASE_URL` not found**
- Make sure `admin/.env` exists
- Frontend .env variables must start with `VITE_`

**Blank screen after login**
- Check browser console for errors
- Make sure backend is running on port 3001
- Check CORS errors (backend should allow `http://localhost:5173`)

### Google Calendar OAuth Not Working

**Error: Redirect URI mismatch**
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth client
3. Make sure `http://localhost:3001/auth/google-calendar/callback` is in **Authorized redirect URIs**
4. Save and wait 5 minutes for propagation

**Error: Access denied**
1. Make sure the consent screen is configured
2. Add your test email to "Test users" in OAuth consent screen

### Messages Not Sending

**In development (mock provider):**
- Messages should show as "SENT" immediately
- Check backend logs for `[MockMessagingProvider]` output
- Phone numbers ending with configured suffix (e.g., `000`) will intentionally fail

**In production:**
- Check messaging provider credentials
- Verify API keys are correct
- Check provider dashboard for error logs

### Database Migration Issues

**Error: Migration failed**
```bash
# Reset database (WARNING: deletes all data)
cd backend
npx prisma migrate reset

# Then run migrations again
npx prisma migrate dev
```

---

## 📝 Quick Reference

### Environment Variables Summary

| Variable | Where to Get It | Required |
|----------|----------------|----------|
| `DATABASE_URL` | Supabase project settings | ✅ Yes |
| `JWT_SECRET` | Generate random string | ✅ Yes |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | ✅ Yes |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | ✅ Yes |
| `MESSAGING_PROVIDER` | Set to `mock` for dev | ✅ Yes |
| `WHATSAPP_API_KEY` | Twilio/provider dashboard | ❌ Optional (production only) |
| `SMS_PROVIDER_API_KEY` | Twilio/provider dashboard | ❌ Optional (production only) |

### Default Ports

- **Backend API**: http://localhost:3001
- **Frontend**: http://localhost:5173
- **Prisma Studio**: http://localhost:5555

### Useful Commands

```bash
# Backend
npm run dev          # Start dev server
npm run build        # Build for production
npx prisma studio    # Visual database editor
npx prisma migrate   # Run database migrations

# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## 🎉 You're All Set!

Your AutoService Retention system should now be running locally. You can:

1. **Add clients** and their vehicles
2. **Sync Google Calendar** to import service appointments
3. **Create retention rules** (time-based or mileage-based)
4. **Generate retention queue** to schedule messages
5. **Dispatch messages** (using mock provider)
6. **Manage templates** (Romanian by default)

For production deployment, see the deployment guides in the main README files.

---

## 📞 Need Help?

- **Issues**: Create an issue in the GitHub repository
- **Docs**: Check `backend/README.md` and `admin/README.md`
- **API Reference**: See `backend/API_DOCUMENTATION.md` (if available)

