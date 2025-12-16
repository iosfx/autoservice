# Autoservice Backend

Node.js + TypeScript backend skeleton using Fastify and Prisma.

## Prerequisites
- Node.js 18+
- Docker + docker-compose
- PostgreSQL connection URL in `.env`

## Setup
1. Copy environment file and fill in required values:
   ```bash
   cp ../infra/env.example .env
   ```
2. Start dependencies:
   ```bash
   docker-compose up -d
   ```
3. Install packages:
   ```bash
   npm install
   ```
4. Generate the Prisma client and apply migrations (create your migration name as needed):
   ```bash
   npx prisma migrate dev
   ```
5. Start the development server:
   ```bash
   npm run dev
   ```

## Available scripts
- `npm run dev` – run the Fastify server with live reload
- `npm run build` – compile TypeScript to `dist/`
- `npm start` – run the compiled server
