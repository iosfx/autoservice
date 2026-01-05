# AutoService Retention Backend

Phase 1 MVP backend for AutoService Retention SaaS - focused exclusively on client retention for auto garages using Google Calendar, mileage-based reminders, and automated WhatsApp/SMS messaging.

## Tech Stack
- **Backend**: Node.js + Fastify + TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: JWT
- **Calendar**: Google Calendar API
- **Messaging**: WhatsApp API + SMS provider (abstracted)

## Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Google Calendar API credentials
- (Optional) WhatsApp/SMS API credentials

## Setup

1. Copy environment file and configure:
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `JWT_SECRET`: A secure random string
   - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`: From Google Cloud Console
   - (Optional) WhatsApp/SMS API credentials

2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Available Scripts
- `npm run dev` – Run the Fastify server with live reload
- `npm run build` – Compile TypeScript to `dist/`
- `npm start` – Run the compiled server

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

## Key Features

- **Authentication**: JWT-based auth for garage owners
- **Google Calendar Sync**: Import service appointments automatically
- **Client Management**: CRUD operations for clients and their cars
- **Mileage Tracking**: Track car mileage and service history
- **Retention Rules**: Create time-based and mileage-based retention triggers
- **Message Queue System**: Queue-based message scheduling with status tracking
- **Manual Triggers**: Run retention generation and dispatch messages on demand
- **Dashboard Summary**: View counts, stats, and upcoming scheduled messages
- **Mock Messaging Provider**: Test locally without real API credentials
- **Queue Management**: Cancel, reschedule, or send individual messages

## Database Schema

The application uses Prisma ORM with the following main entities:
- **Garage**: Auto shop/garage with last sync tracking
- **User**: Garage owner/staff
- **Client**: Customer with contact info and birthday
- **Car**: Customer's vehicle with mileage tracking
- **ServiceVisit**: Service appointment (synced from calendar)
- **RetentionRule**: Rules for when to send reminders
- **MessageQueue**: Scheduled messages with status tracking (SCHEDULED, DUE, SENDING, SENT, FAILED, CANCELED, BLOCKED)
- **MessageLog**: Immutable history of all message attempts
- **CalendarToken**: Google Calendar OAuth tokens

## Retention Queue System

The retention system uses a queue-based approach:

1. **Generation**: Run retention rules to create `MessageQueue` items
2. **Scheduling**: Queue items track when to send (scheduledFor)
3. **Dispatch**: Process due messages and update status
4. **Logging**: Every send attempt creates a `MessageLog` entry
5. **Retry Logic**: Failed messages automatically retry with exponential backoff

### Queue Status Flow

```
SCHEDULED → DUE → SENDING → SENT
                       ↓
                    FAILED (retry)
                       ↓
                    FAILED (max retries)
```

### Manual Operations

**Run Retention Generation**:
```bash
curl -X POST http://localhost:3001/retention/run \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"lookaheadDays": 14}'
```

**Dispatch Due Messages**:
```bash
curl -X POST http://localhost:3001/messages/dispatch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"limit": 100}'
```

**Check Dashboard**:
```bash
curl http://localhost:3001/dashboard/retention-summary \
  -H "Authorization: Bearer <token>"
```

## Project Structure

```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── db/
│   │   └── client.ts          # Prisma client
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication
│   ├── routes/
│   │   ├── auth.ts            # Auth & OAuth endpoints
│   │   ├── calendar.ts        # Calendar sync
│   │   ├── clients.ts         # Client CRUD
│   │   ├── cars.ts            # Car CRUD
│   │   ├── retention.ts       # Retention rules & alerts
│   │   ├── messages.ts        # Message sending
│   │   └── health.ts          # Health check
│   ├── services/
│   │   ├── authService.ts     # Auth logic
│   │   ├── calendarService.ts # Google Calendar integration
│   │   ├── retentionService.ts# Retention logic
│   │   └── messagingService.ts# Messaging abstraction
│   ├── types/
│   │   └── fastify-jwt.d.ts   # TypeScript definitions
│   └── index.ts               # Main server
└── package.json
```

## Phase 1 Scope

This MVP is focused on:
- ✅ Client retention tracking
- ✅ Google Calendar integration (read-only)
- ✅ Mileage and time-based reminders
- ✅ Automated messaging (WhatsApp/SMS abstraction)
- ✅ Owner-only API access

**Explicit Non-Goals:**
- ❌ Customer-facing app
- ❌ Mechanic app
- ❌ Inventory management
- ❌ Billing/invoicing
- ❌ AI features
- ❌ Calendar write-back

## Deployment

Recommended: Deploy on Render (free tier)

1. Push code to GitHub
2. Create new Web Service on Render
3. Connect your repository
4. Set environment variables
5. Deploy!

## Support

For issues or questions, please create an issue in the repository.
