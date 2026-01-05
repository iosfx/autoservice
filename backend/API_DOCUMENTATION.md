# AutoService Retention API Documentation

## Overview

This is the backend API for AutoService Retention SaaS - a Phase 1 MVP focused exclusively on client retention for auto garages using Google Calendar, mileage-based reminders, and automated WhatsApp/SMS messaging.

## Base URL

```
http://localhost:3001
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

---

## API Endpoints

### Health

#### GET `/health`

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-05T10:30:00.000Z"
}
```

---

### Authentication

#### POST `/auth/register`

Register a new garage and owner account.

**Request Body:**
```json
{
  "garageName": "Mike's Auto Shop",
  "email": "owner@example.com",
  "password": "securePassword123",
  "name": "Mike Johnson",
  "timezone": "America/New_York"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "garage": {
    "id": "uuid",
    "name": "Mike's Auto Shop",
    "timezone": "America/New_York"
  },
  "user": {
    "id": "uuid",
    "email": "owner@example.com",
    "name": "Mike Johnson"
  }
}
```

#### POST `/auth/login`

Login to get a JWT token.

**Request Body:**
```json
{
  "email": "owner@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "owner@example.com",
    "name": "Mike Johnson",
    "garageId": "uuid"
  }
}
```

#### POST `/auth/google-calendar/connect`

Get Google Calendar OAuth URL to connect calendar.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### GET `/auth/google-calendar/callback`

OAuth callback endpoint (called by Google after authorization).

**Query Parameters:**
- `code`: Authorization code from Google

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Google Calendar connected successfully"
}
```

---

### Calendar

#### POST `/calendar/sync`

Sync calendar events to database as ServiceVisits.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "calendarId": "primary"
}
```

**Response:**
```json
{
  "success": true,
  "syncedCount": 15,
  "events": [...]
}
```

#### GET `/calendar/visits`

Get upcoming service visits.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `days` (optional): Number of days ahead to look (default: 7)

**Response:**
```json
{
  "visits": [
    {
      "id": "uuid",
      "serviceDate": "2024-01-10T14:00:00.000Z",
      "client": {
        "id": "uuid",
        "name": "John Doe",
        "phone": "+1234567890"
      },
      "car": {
        "id": "uuid",
        "licensePlate": "ABC123",
        "currentMileage": 50000
      }
    }
  ]
}
```

---

### Clients

#### GET `/clients`

Get all clients for the garage.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "John Doe",
      "phone": "+1234567890",
      "birthday": "1985-03-15T00:00:00.000Z",
      "cars": [...],
      "_count": {
        "serviceVisits": 5,
        "messageLogs": 10
      }
    }
  ]
}
```

#### GET `/clients/:id`

Get a single client with details.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "client": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+1234567890",
    "birthday": "1985-03-15T00:00:00.000Z",
    "cars": [...],
    "serviceVisits": [...],
    "messageLogs": [...]
  }
}
```

#### POST `/clients`

Create a new client.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "birthday": "1985-03-15"
}
```

**Response:**
```json
{
  "client": {
    "id": "uuid",
    "name": "John Doe",
    "phone": "+1234567890",
    "birthday": "1985-03-15T00:00:00.000Z"
  }
}
```

#### PUT `/clients/:id`

Update a client.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "birthday": "1985-03-15"
}
```

#### DELETE `/clients/:id`

Delete a client.

**Headers:** `Authorization: Bearer <token>`

---

### Cars

#### POST `/cars`

Create a new car for a client.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "clientId": "uuid",
  "licensePlate": "ABC123",
  "vin": "1HGBH41JXMN109186",
  "currentMileage": 50000
}
```

**Response:**
```json
{
  "car": {
    "id": "uuid",
    "licensePlate": "ABC123",
    "vin": "1HGBH41JXMN109186",
    "currentMileage": 50000,
    "lastServiceDate": null,
    "client": {...}
  }
}
```

#### GET `/cars/:id`

Get car details.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "car": {
    "id": "uuid",
    "licensePlate": "ABC123",
    "vin": "1HGBH41JXMN109186",
    "currentMileage": 50000,
    "lastServiceDate": "2024-01-05T00:00:00.000Z",
    "client": {...},
    "serviceVisits": [...]
  }
}
```

#### PUT `/cars/:id/mileage`

Update car mileage (also updates lastServiceDate).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentMileage": 55000
}
```

**Response:**
```json
{
  "car": {
    "id": "uuid",
    "currentMileage": 55000,
    "lastServiceDate": "2024-01-05T12:30:00.000Z"
  }
}
```

#### PUT `/cars/:id`

Update car details.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "licensePlate": "ABC123",
  "vin": "1HGBH41JXMN109186",
  "currentMileage": 55000
}
```

#### DELETE `/cars/:id`

Delete a car.

**Headers:** `Authorization: Bearer <token>`

---

### Retention

#### GET `/retention/alerts`

Get retention alerts based on active rules.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "alerts": [
    {
      "ruleId": "uuid",
      "ruleType": "TIME",
      "clientId": "uuid",
      "clientName": "John Doe",
      "clientPhone": "+1234567890",
      "carId": "uuid",
      "licensePlate": "ABC123",
      "daysSinceService": 180,
      "message": "Hi John Doe, it's been 180 days since your last service..."
    },
    {
      "ruleType": "MILEAGE",
      "clientName": "Jane Smith",
      "licensePlate": "XYZ789",
      "mileageSinceService": 5500,
      "message": "Hi Jane Smith, your car XYZ789 has driven 5500 miles..."
    }
  ],
  "count": 2
}
```

#### GET `/retention/rules`

Get all retention rules for the garage.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "rules": [
    {
      "id": "uuid",
      "type": "TIME",
      "threshold": 180,
      "messageTemplate": "Hi {{clientName}}, it's been {{daysSinceService}} days...",
      "isActive": true
    }
  ]
}
```

#### POST `/retention/rules`

Create a new retention rule.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "type": "MILEAGE",
  "threshold": 5000,
  "messageTemplate": "Hi {{clientName}}, your car {{licensePlate}} has driven {{mileageSinceService}} miles since your last service. Time for a checkup!"
}
```

**Response:**
```json
{
  "rule": {
    "id": "uuid",
    "type": "MILEAGE",
    "threshold": 5000,
    "messageTemplate": "...",
    "isActive": true
  }
}
```

#### PUT `/retention/rules/:id`

Update a retention rule.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "threshold": 6000,
  "messageTemplate": "Updated message...",
  "isActive": true
}
```

#### DELETE `/retention/rules/:id`

Delete a retention rule.

**Headers:** `Authorization: Bearer <token>`

#### POST `/retention/process`

Process retention alerts and send messages (manual trigger).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "totalAlerts": 5,
  "sentMessages": [...]
}
```

---

### Messages

#### POST `/messages/send`

Send a message to a client.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "clientId": "uuid",
  "type": "WHATSAPP",
  "content": "Your car is ready for pickup!"
}
```

**Response:**
```json
{
  "success": true,
  "messageLog": {
    "id": "uuid",
    "type": "WHATSAPP",
    "content": "Your car is ready for pickup!",
    "status": "SENT",
    "sentAt": "2024-01-05T12:30:00.000Z"
  }
}
```

#### GET `/messages/client/:clientId`

Get message history for a specific client.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "type": "SMS",
      "content": "Your car is ready!",
      "status": "SENT",
      "sentAt": "2024-01-05T12:30:00.000Z"
    }
  ]
}
```

#### GET `/messages`

Get recent messages for the garage.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "type": "WHATSAPP",
      "content": "...",
      "status": "SENT",
      "sentAt": "2024-01-05T12:30:00.000Z",
      "client": {
        "id": "uuid",
        "name": "John Doe",
        "phone": "+1234567890"
      }
    }
  ]
}
```

---

## Data Models

### Garage
- `id`: UUID
- `name`: string
- `timezone`: string (default: "UTC")

### Client
- `id`: UUID
- `garageId`: UUID
- `name`: string
- `phone`: string
- `birthday`: Date (optional)

### Car
- `id`: UUID
- `clientId`: UUID
- `licensePlate`: string
- `vin`: string (optional)
- `currentMileage`: number
- `lastServiceDate`: Date (optional)

### ServiceVisit
- `id`: UUID
- `garageId`: UUID
- `clientId`: UUID
- `carId`: UUID (optional)
- `calendarEventId`: string (optional)
- `serviceDate`: Date
- `mileageAtVisit`: number (optional)
- `notes`: string (optional)

### RetentionRule
- `id`: UUID
- `garageId`: UUID
- `type`: "MILEAGE" | "TIME"
- `threshold`: number
- `messageTemplate`: string
- `isActive`: boolean

### MessageLog
- `id`: UUID
- `clientId`: UUID
- `type`: "SMS" | "WHATSAPP"
- `content`: string
- `status`: "SENT" | "FAILED"
- `sentAt`: Date

---

## Setup

1. Copy `.env.example` to `.env` and configure:
   ```bash
   cp .env.example .env
   ```

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

5. Start the server:
   ```bash
   npm run dev
   ```

---

## Tech Stack

- **Backend**: Node.js + Fastify + TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: JWT
- **Calendar**: Google Calendar API
- **Messaging**: WhatsApp API + SMS provider (abstracted)

---

## Phase 1 Scope

This MVP is focused on:
- Client retention tracking
- Google Calendar integration
- Mileage and time-based reminders
- Automated messaging (WhatsApp/SMS)
- Owner-only access (no customer or mechanic apps)

**Explicit Non-Goals for Phase 1:**
- Customer-facing app
- Mechanic app
- Inventory management
- Billing/invoicing
- AI features
- Calendar write-back
