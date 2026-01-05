# Retention Flow - End-to-End Scenario

This document describes a realistic garage scenario demonstrating how the AutoService Retention system works from start to finish.

## Scenario: Mike's Auto Shop

**Garage**: Mike's Auto Shop
**Owner**: Mike Johnson
**Location**: New York, NY
**Timezone**: America/New_York

---

## Step 1: Initial Setup

### 1.1 Garage Registration

Mike registers his garage and creates an account:

```bash
POST /auth/register
{
  "garageName": "Mike's Auto Shop",
  "email": "mike@autoshop.com",
  "password": "SecurePassword123!",
  "name": "Mike Johnson",
  "timezone": "America/New_York"
}
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "garage": {
    "id": "garage-123",
    "name": "Mike's Auto Shop",
    "timezone": "America/New_York"
  },
  "user": {
    "id": "user-456",
    "email": "mike@autoshop.com",
    "name": "Mike Johnson"
  }
}
```

Mike saves the JWT token for all subsequent API calls.

---

### 1.2 Connect Google Calendar

Mike connects his Google Calendar where he tracks all customer appointments:

```bash
POST /auth/google-calendar/connect
Authorization: Bearer <token>
```

**Response**:
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

Mike visits the `authUrl`, authorizes the app, and is redirected back with an authorization code. The system exchanges this for access/refresh tokens and stores them.

---

### 1.3 Add Client and Car Data

Mike adds his existing customers manually:

**Add Client - John Doe**:
```bash
POST /clients
Authorization: Bearer <token>
{
  "name": "John Doe",
  "phone": "+12125551234",
  "birthday": "1985-05-15"
}
```

**Add John's Car**:
```bash
POST /cars
Authorization: Bearer <token>
{
  "clientId": "client-john-123",
  "licensePlate": "ABC-1234",
  "vin": "1HGBH41JXMN109186",
  "currentMileage": 45000
}
```

Mike repeats this for 50 of his regular customers.

---

## Step 2: Configure Retention Rules

Mike wants to send reminders to customers who:
1. Haven't had service in 6 months (180 days)
2. Have driven more than 5,000 miles since last service

### 2.1 Time-Based Rule

```bash
POST /retention/rules
Authorization: Bearer <token>
{
  "type": "TIME",
  "threshold": 180,
  "messageTemplate": "Hi {{clientName}}! It's been {{daysSinceService}} days since your last service for {{licensePlate}}. Time for a checkup! - Mike's Auto Shop"
}
```

### 2.2 Mileage-Based Rule

```bash
POST /retention/rules
Authorization: Bearer <token>
{
  "type": "MILEAGE",
  "threshold": 5000,
  "messageTemplate": "Hi {{clientName}}! Your {{licensePlate}} has driven {{mileageSinceService}} miles since your last service. Let's schedule a maintenance appointment! - Mike's Auto Shop"
}
```

---

## Step 3: Sync Calendar

Mike syncs his Google Calendar to import past appointments:

```bash
POST /calendar/sync
Authorization: Bearer <token>
{
  "calendarId": "primary"
}
```

**Response**:
```json
{
  "success": true,
  "syncedCount": 127,
  "events": [...]
}
```

The system:
- Imports all appointments from the past 30 days and future 90 days
- Matches calendar events to clients based on phone numbers or names in the event description
- Creates `ServiceVisit` records
- Updates the garage's `lastSyncAt` timestamp

---

## Step 4: Run Retention Generation

Mike manually triggers retention generation to create message queue items:

```bash
POST /retention/run
Authorization: Bearer <token>
{
  "lookaheadDays": 14
}
```

**Response**:
```json
{
  "created": 12,
  "blocked": 3,
  "skipped": 2,
  "items": {
    "created": [
      {
        "id": "queue-001",
        "clientId": "client-john-123",
        "carId": "car-abc-123",
        "triggerType": "SERVICE_DUE_TIME",
        "scheduledFor": "2024-01-06T10:00:00Z",
        "status": "DUE"
      },
      ...
    ],
    "blocked": [
      {
        "id": "queue-002",
        "clientId": "client-jane-456",
        "carId": "car-xyz-789",
        "status": "BLOCKED",
        "blockedReason": "No mileage data available"
      }
    ],
    "skipped": [
      {
        "clientId": "client-bob-789",
        "carId": "car-def-456",
        "reason": "Active queue item already exists"
      }
    ]
  }
}
```

**What happened**:
- 12 customers qualify for retention messages (haven't serviced in 180+ days or driven 5000+ miles)
- 3 cars are blocked because they lack mileage data
- 2 customers already have active queue items, so they're skipped to avoid duplicate messages

---

## Step 5: Check Dashboard

Mike checks his dashboard to see what's scheduled:

```bash
GET /dashboard/retention-summary
Authorization: Bearer <token>
```

**Response**:
```json
{
  "dueCount": 12,
  "scheduledCount": 0,
  "failedCount": 0,
  "blockedCount": 3,
  "sentLast24hCount": 0,
  "lastCalendarSyncAt": "2024-01-05T15:30:00Z",
  "activeRulesCount": 2,
  "nextScheduled": [
    {
      "id": "queue-001",
      "clientName": "John Doe",
      "clientPhone": "+12125551234",
      "carLicensePlate": "ABC-1234",
      "scheduledFor": "2024-01-06T10:00:00Z",
      "triggerType": "SERVICE_DUE_TIME",
      "preview": "Hi John Doe! It's been 185 days since your last service for ABC-1234. Time for a checkup!",
      "status": "DUE"
    },
    ...
  ]
}
```

---

## Step 6: Dispatch Messages

Mike manually dispatches all due messages:

```bash
POST /messages/dispatch
Authorization: Bearer <token>
{
  "limit": 100
}
```

**Response**:
```json
{
  "total": 12,
  "sent": 11,
  "failed": 1,
  "errors": [
    "Message queue-007: Mock failure: phone ends with 000"
  ]
}
```

**What happened**:
- The system retrieved all 12 "DUE" queue items
- For each item:
  1. Status changed to "SENDING"
  2. Message sent via MockMessagingProvider (WhatsApp)
  3. `MessageLog` record created
  4. Status changed to "SENT" (or "FAILED" with retry logic)
- 11 messages sent successfully
- 1 message failed (customer's phone ends with "000" which triggers mock failure)

**Failed Message Retry**:
- The failed message automatically reschedules for 15 minutes later
- After 3 failed attempts total, it stays in "FAILED" status

---

## Step 7: Review Queue Status

Mike checks the message queue to see what's happened:

```bash
GET /retention/queue?status=SENT
Authorization: Bearer <token>
```

**Response**:
```json
{
  "queue": [
    {
      "id": "queue-001",
      "clientName": "John Doe",
      "clientPhone": "+12125551234",
      "carLicensePlate": "ABC-1234",
      "triggerType": "SERVICE_DUE_TIME",
      "scheduledFor": "2024-01-06T10:00:00Z",
      "sentAt": "2024-01-06T10:05:23Z",
      "status": "SENT"
    },
    ...
  ],
  "count": 11
}
```

Mike can also check failed messages:

```bash
GET /retention/queue?status=FAILED
Authorization: Bearer <token>
```

---

## Step 8: Manual Actions

### 8.1 Send a Single Message Now

Mike wants to immediately send a specific queued message:

```bash
POST /retention/queue/queue-005/send-now
Authorization: Bearer <token>
```

### 8.2 Cancel a Scheduled Message

A customer called and scheduled already, so Mike cancels their reminder:

```bash
POST /retention/queue/queue-003/cancel
Authorization: Bearer <token>
```

### 8.3 Reschedule a Message

Mike wants to delay a message until next week:

```bash
POST /retention/queue/queue-008/reschedule
Authorization: Bearer <token>
{
  "scheduledFor": "2024-01-13T10:00:00Z"
}
```

---

## Step 9: Customer Comes In

John Doe comes in for service. Mike updates his car's mileage:

```bash
PUT /cars/car-abc-123/mileage
Authorization: Bearer <token>
{
  "currentMileage": 48500
}
```

This also updates `lastServiceDate` to now, so John won't get another retention message for another 180 days.

---

## Step 10: Ongoing Operations

### Daily Routine:
1. **Morning**: Mike syncs his calendar (`POST /calendar/sync`)
2. **Noon**: Mike runs retention generation (`POST /retention/run`)
3. **Afternoon**: Mike dispatches due messages (`POST /messages/dispatch`)
4. **Evening**: Mike checks the dashboard to see results

### Weekly Review:
```bash
GET /dashboard/retention-summary
```

Mike reviews:
- How many messages were sent
- How many customers are due
- Any blocked or failed messages that need attention

---

## Step 11: Blocked Messages Resolution

Mike notices 3 blocked messages due to missing mileage data. He:

1. Checks which cars are blocked:
```bash
GET /retention/queue?status=BLOCKED
```

2. Updates mileage for those cars when customers call or visit

3. The next retention run will pick them up automatically

---

## Production Workflow (Future)

In production, Mike would:
1. Set up a cron job or scheduled task to run retention generation daily
2. Set up another scheduled task to dispatch messages automatically
3. Monitor the dashboard weekly instead of manually triggering

But for Phase 1 MVP, manual triggers give Mike full control and transparency.

---

## Key Benefits

1. **No missed customers**: Automatic tracking of service intervals
2. **Time savings**: No manual reminder calls
3. **Transparency**: Full visibility into what messages are scheduled and sent
4. **Control**: Mike can cancel, reschedule, or manually send any message
5. **No data loss**: All messages logged with timestamps and status
6. **Smart deduplication**: Won't send duplicate reminders

---

## Queue Status Flow

```
SCHEDULED → DUE → SENDING → SENT
                       ↓
                    FAILED (with retries)
                       ↓
                    FAILED (max retries)

CANCELED (at any point before SENDING)
BLOCKED (when created with missing data)
```

---

## Message Templates

Mike can customize message templates using variables:

- `{{clientName}}` - Customer's name
- `{{licensePlate}}` - Car's license plate
- `{{daysSinceService}}` - Days since last service (TIME rules)
- `{{mileageSinceService}}` - Miles since last service (MILEAGE rules)

Example:
```
"Hi {{clientName}}! Your {{licensePlate}} is due for service. It's been {{daysSinceService}} days. Call us to schedule! - Mike's Auto Shop"
```

---

## Conclusion

This workflow shows how Mike's Auto Shop uses the retention system to:
1. Never miss a customer follow-up
2. Automate reminder messages
3. Track all communications
4. Maintain full control over the process

The system is simple, transparent, and extensible for future features like:
- Automatic scheduling (cron jobs)
- Birthday messages
- Appointment reminders
- Service completion notifications
