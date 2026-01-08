# AutoService Admin Dashboard

Web-based admin dashboard for managing the AutoService Retention system. Built with Vite, React, TypeScript, and Tailwind CSS.

## Features

- **Retention Inbox**: View and manage scheduled messages, dispatch retention campaigns
- **Client Management**: Add, edit clients and their vehicles
- **Template Management**: Configure and preview message templates
- **Message History**: View sent messages and delivery status
- **Settings**: View garage info and system configuration

## Tech Stack

- **Build Tool**: Vite
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Apple-like minimal design)
- **Routing**: React Router v6
- **State Management**: TanStack Query (React Query)
- **Forms**: react-hook-form + zod (optional)
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AutoService backend running (default: http://localhost:3001)

### Installation

```bash
cd admin
npm install
```

### Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` to configure the backend API URL:

```env
VITE_API_BASE_URL=http://localhost:3001
```

### Development

Start the dev server:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Build output will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
admin/
├── src/
│   ├── api/
│   │   └── client.ts           # API client with auth
│   ├── components/
│   │   ├── AppShell.tsx        # Main layout with nav
│   │   ├── Button.tsx          # Reusable button
│   │   ├── Card.tsx            # Card container
│   │   ├── Modal.tsx           # Modal component
│   │   ├── Toast.tsx           # Toast notifications
│   │   └── ProtectedRoute.tsx  # Auth guard
│   ├── lib/
│   │   └── auth.ts             # Auth utilities
│   ├── pages/
│   │   ├── LoginPage.tsx       # Login
│   │   ├── InboxPage.tsx       # Retention inbox
│   │   ├── ClientsPage.tsx     # Client list
│   │   ├── ClientDetailPage.tsx # Client details
│   │   ├── TemplatesPage.tsx   # Message templates
│   │   ├── MessagesPage.tsx    # Message history
│   │   └── SettingsPage.tsx    # Settings
│   ├── App.tsx                 # Router config
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
├── index.html
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## API Integration

The dashboard integrates with the AutoService backend via REST API:

### Authentication
- Login: `POST /auth/login` → Returns JWT token
- Token stored in localStorage
- Auto-attached to all requests via `Authorization: Bearer <token>`

### Key Endpoints
- **Dashboard**: `GET /dashboard/retention-summary`
- **Queue**: `GET /retention/queue?status=DUE`
- **Run Retention**: `POST /retention/run`
- **Dispatch**: `POST /messages/dispatch`
- **Clients**: `GET /clients`, `POST /clients`, `PUT /clients/:id`
- **Cars**: `POST /cars`, `PUT /cars/:id/mileage`
- **Templates**: `GET /templates`, `PUT /templates/:id`
- **Messages**: `GET /messages/history`

## Design Guidelines

The dashboard follows Apple-like design principles:

- **Minimal & Clean**: Lots of whitespace, subtle borders
- **Typography**: Clear hierarchy with system fonts
- **Colors**: Calm neutrals with blue accents
- **Cards**: Soft shadows, rounded corners (2xl)
- **Responsive**: Mobile-first with bottom tabs on small screens, sidebar on desktop
- **Feedback**: Toast notifications for all actions

## Development Notes

### Authentication Flow
1. User logs in via `/login`
2. JWT token received and stored in localStorage
3. All API requests include `Authorization` header
4. Protected routes redirect to `/login` if no token
5. Logout clears token and redirects to `/login`

### State Management
- Uses TanStack Query for server state caching
- Query keys follow pattern: `['resource', id?, filters?]`
- Mutations automatically invalidate relevant queries
- 30s stale time, no refetch on window focus

### Mobile Responsiveness
- Desktop (md+): Sidebar navigation on left
- Mobile: Bottom tab navigation (5 main pages)
- Content area adapts with responsive padding
- Modals are full-screen on mobile

## Troubleshooting

### Backend Connection Issues
- Verify backend is running on port 3001
- Check `VITE_API_BASE_URL` in `.env`
- Check browser console for CORS errors

### Build Errors
- Delete `node_modules` and `package-lock.json`, then `npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

### Authentication Issues
- Clear localStorage: `localStorage.clear()`
- Check token format in backend response
- Verify JWT is being sent in request headers

## Future Enhancements

- Dark mode toggle
- Real-time updates with WebSockets
- Advanced filtering and search
- Bulk operations
- Export data to CSV
- Detailed analytics dashboard
- User management (multi-user garages)

## License

Proprietary - AutoService Retention SaaS
