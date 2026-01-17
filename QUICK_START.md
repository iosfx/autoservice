# AutoService - Quick Start Checklist

**Estimated time: 15-20 minutes**

This is a condensed checklist for getting AutoService running locally. For detailed explanations, see `CONFIGURATION_GUIDE.md`.

---

## ✅ Prerequisites Checklist

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL access (we'll use Supabase free tier)
- [ ] Google account (for Calendar API)
- [ ] Code editor (VS Code recommended)
- [ ] 2 terminal windows ready

---

## 📦 Step 1: Get Your Database (5 min)

**Supabase Setup:**

1. [ ] Go to https://supabase.com/ → Sign up
2. [ ] Create new project: `autoservice-retention`
3. [ ] **Save the database password!** (you'll need it)
4. [ ] Wait for provisioning (~2 min)
5. [ ] Go to **Settings** → **Database** → Copy **Connection string (URI)**
6. [ ] Replace `[YOUR-PASSWORD]` with your actual password

**You now have:**
```
postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres
```

---

## 🔑 Step 2: Get Google Calendar API (10 min)

**Google Cloud Console:**

1. [ ] Go to https://console.cloud.google.com/
2. [ ] Create new project: `AutoService Retention`
3. [ ] Enable **Google Calendar API** (search in API Library)
4. [ ] Configure consent screen:
   - [ ] External
   - [ ] App name: `AutoService Retention`
   - [ ] Your email for support
   - [ ] Skip scopes and test users
5. [ ] Create credentials:
   - [ ] Type: **OAuth client ID**
   - [ ] Application type: **Web application**
   - [ ] Authorized redirect URI: `http://localhost:3001/auth/google-calendar/callback`
6. [ ] **Copy Client ID and Client Secret!**

**You now have:**
- Client ID: `123456789-xxxx.apps.googleusercontent.com`
- Client Secret: `GOCSPX-xxxxxxxx`

---

## ⚙️ Step 3: Configure Backend (3 min)

```bash
cd backend

# 1. Copy environment file
cp .env.example .env

# 2. Edit .env file
# Open in your editor and fill in:
```

**Minimal Required Configuration:**

```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# JWT Secret (generate a random 32+ character string)
JWT_SECRET=your-super-long-random-secret-string-min-32-chars

# Google Calendar (from Google Cloud Console)
GOOGLE_CLIENT_ID=123456789-xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google-calendar/callback

# Messaging (keep as mock for development)
MESSAGING_PROVIDER=mock
```

**Generate JWT Secret:**
```bash
# Mac/Linux
openssl rand -base64 32

# Windows PowerShell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | % {[char]$_})
```

---

## 🚀 Step 4: Start Backend (2 min)

```bash
# Still in backend/ directory

# 1. Install dependencies
npm install

# 2. Generate Prisma client
npx prisma generate

# 3. Create database tables
npx prisma migrate dev
# When prompted for migration name, just press Enter

# 4. Start server
npm run dev
```

**✅ Success:** You should see:
```
Server listening at http://0.0.0.0:3001
```

Leave this terminal running!

---

## 🎨 Step 5: Start Frontend (2 min)

**Open a NEW terminal:**

```bash
cd admin

# 1. Copy environment file
cp .env.example .env

# 2. Edit .env (if needed)
# Default is: VITE_API_BASE_URL=http://localhost:3001
# This should work as-is for local development

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev
```

**✅ Success:** You should see:
```
➜  Local:   http://localhost:5173/
```

---

## 👤 Step 6: Create First User (1 min)

**Option A: Using curl (Mac/Linux/Windows with Git Bash):**

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "Admin123!",
    "name": "Admin User",
    "garageName": "Test Garage",
    "timezone": "America/New_York"
  }'
```

**Option B: Using Prisma Studio (visual database editor):**

```bash
# In backend directory
npx prisma studio
```
Opens at http://localhost:5555 - you can add users visually.

**Save your login:**
- Email: `admin@test.com`
- Password: `Admin123!`

---

## 🎉 Step 7: Test the App (2 min)

1. [ ] Open browser: http://localhost:5173
2. [ ] Login with your credentials
3. [ ] You should see the Inbox dashboard
4. [ ] Navigate through pages:
   - [ ] **Inbox** - Shows retention summary (should be empty)
   - [ ] **Clients** - Click "Add Client" to test
   - [ ] **Templates** - Click "Seed Defaults" to create Romanian templates
   - [ ] **Messages** - Will be empty until you send some
   - [ ] **Settings** - Shows garage info

---

## ✨ Quick Workflow Test

**Add a test client and trigger a message:**

1. **Add a Client:**
   - Go to **Clients** → **Add Client**
   - Name: `John Doe`
   - Phone: `+1234567890`
   - Birthday: Pick any date

2. **Add a Car:**
   - Click on the client you just created
   - **Add Car**
   - License Plate: `ABC-123`
   - Current Mileage: `50000`
   - Last Service Date: Pick a date 6+ months ago

3. **Seed Templates:**
   - Go to **Templates**
   - Click **Seed Defaults** (creates Romanian message templates)

4. **Run Retention:**
   - Go to **Inbox**
   - Enter `14` in the "Days" field
   - Click **Run Retention**
   - You should see messages generated!

5. **Dispatch Messages:**
   - In **Inbox**, click **Dispatch Due**
   - Messages will be "sent" (using mock provider)
   - Check **Messages** page to see history

---

## 🔍 Verify Everything Works

### Backend Health Check
```bash
curl http://localhost:3001/health
```
Should return: `{"status":"healthy"}`

### Frontend Working
- Open DevTools (F12)
- Check Console - should see `[API]` logs
- No red errors

### Database Working
```bash
cd backend
npx prisma studio
```
- Opens visual database editor
- You should see your Garage, User, Client, Car, and MessageQueue tables

---

## 🐛 Common Issues

### Backend won't start
```bash
# Make sure .env exists and has DATABASE_URL
ls -la backend/.env

# Regenerate Prisma client
cd backend
npx prisma generate
```

### Frontend blank after login
```bash
# Check backend is running on port 3001
curl http://localhost:3001/health

# Check CORS - open browser DevTools console
# Should NOT see CORS errors
```

### Database connection error
```bash
# Test database connection
cd backend
npx prisma db pull
# Should connect successfully
```

### Google Calendar OAuth not working
1. Check `GOOGLE_REDIRECT_URI` matches Google Cloud Console
2. Wait 5 minutes after changing Google Cloud settings
3. Use incognito browser window to clear cookies

---

## 📊 What You Have Now

✅ **Backend API** running on http://localhost:3001
✅ **Frontend Dashboard** running on http://localhost:5173
✅ **PostgreSQL Database** (Supabase)
✅ **Google Calendar** integration ready
✅ **Mock Messaging** for testing (no real SMS/WhatsApp)
✅ **JWT Authentication** working

---

## 🎯 Next Steps

1. **Add more clients and cars**
2. **Connect Google Calendar** (click calendar sync in dashboard)
3. **Create retention rules** (currently uses defaults)
4. **Test the retention workflow** (generate → dispatch → view messages)
5. **Customize templates** (default are in Romanian)

---

## 📚 Additional Resources

- **Full Configuration Guide:** `CONFIGURATION_GUIDE.md`
- **Backend README:** `backend/README.md`
- **Frontend README:** `admin/README.md`
- **API Documentation:** `backend/API_DOCUMENTATION.md` (if exists)
- **Retention Workflow:** `docs/workflows/retention-flow.md`

---

## 🆘 Still Stuck?

1. Check both terminals are running (backend + frontend)
2. Check browser console for errors (F12 → Console)
3. Check backend terminal for API errors
4. Verify `.env` files exist and have correct values
5. Try restarting both servers
6. Check `CONFIGURATION_GUIDE.md` for detailed troubleshooting

---

**Congratulations! 🎉 Your AutoService Retention system is running!**

