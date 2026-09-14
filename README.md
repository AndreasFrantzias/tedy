# Event Management & Ticketing System

A full‑stack application for managing events, ticket sales, user roles, messaging, and recommendations.  
The backend is built with **NestJS** and **Prisma** (PostgreSQL), while the frontend is a modern JavaScript/TypeScript framework (Angular/React – not included in this repo).  
The project follows a **web browser / web server** architecture and uses **JWT** for authentication and role‑based access control.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Prerequisites](#prerequisites)
6. [Installation](#installation)
7. [Environment Variables](#environment-variables)
8. [Database Schema](#database-schema)
9. [Running the Application](#running-the-application)
10. [Available Scripts](#available-scripts)
11. [API Endpoints](#api-endpoints)
12. [Deployment](#deployment)
13. [Testing](#testing)
14. [Contributing](#contributing)
15. [License](#license)

---

## Project Overview

The system allows four types of users:

| Role | Description |
|------|-------------|
| **Admin** | Full control over users, events, and system configuration. |
| **Organizer** | Can create, edit, publish, and cancel events. |
| **Participant** | Can browse events, search, and book tickets. |
| **Visitor** | Can browse events but cannot book tickets. |

Key functionalities include:

- **User registration & approval** (admin approval required).
- **Event lifecycle**: draft → published → completed/cancelled.
- **Ticket types & capacity management**.
- **Bookings** with validation against capacity and ticket availability.
- **Messaging** between organizers and participants.
- **Event export** to XML/JSON (matching the provided DTD).
- **Recommendation engine** (Biased Matrix Factorization) – placeholder for future implementation.

---

## Features

- **REST API** secured with JWT and role guards.
- **Role‑based access control** via custom decorators.
- **Prisma ORM** with auto‑generated TypeScript types.
- **Database migrations** and seeding scripts.
- **Environment‑based configuration** (`.env`).
- **Unit & integration tests** with Jest.
- **Linting & formatting** (ESLint + Prettier).
- **Docker support** (not included but easy to add).

---

## Architecture

```
┌───────────────────────┐
│  Frontend (Angular/React)  │
└─────────────┬─────────┘
              │
              ▼
┌───────────────────────┐
│  NestJS Backend (API) │
│  ├─ Controllers        │
│  ├─ Services           │
│  ├─ Modules            │
│  ├─ Guards & Decorators│
│  └─ Prisma Client      │
└─────────────┬─────────┘
              │
              ▼
┌───────────────────────┐
│  PostgreSQL Database  │
└───────────────────────┘
```

- **Controllers** expose REST endpoints.
- **Services** contain business logic.
- **Modules** group related functionality.
- **Guards** enforce authentication/authorization.
- **Prisma** handles data persistence and type safety.

---

## Tech Stack

| Category | Tool | Version |
|----------|------|---------|
| **Backend** | NestJS | ^11.0.1 |
| | Prisma | ^7.8.0 |
| | PostgreSQL | - |
| | JWT | ^11.0.2 |
| | Passport | ^0.7.0 |
| | bcrypt | ^6.0.0 |
| | class-validator | ^0.15.1 |
| | class-transformer | ^0.5.1 |
| | dotenv | ^17.4.2 |
| **Testing** | Jest | ^30.2.0 |
| | ts-jest | ^29.4.9 |
| **Linting** | ESLint | ^9.18.0 |
| | Prettier | ^3.4.2 |
| **Build** | TypeScript | ^5.7.3 |
| | ts-node | ^10.9.2 |
| | tsconfig-paths | ^4.2.0 |

All dependencies are listed in `package.json`. The `devDependencies` include tools for linting, testing, and building.

---

## Prerequisites

- Node.js **>= 20** (recommended LTS)
- npm **>= 10** or yarn
- PostgreSQL **>= 15**
- Docker (optional, for containerized deployment)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/your-org/event-management.git
cd event-management

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Generate Prisma client
npx prisma generate

# Run migrations (creates tables)
npx prisma migrate dev --name init

# Seed the database (creates admin user)
npm run prisma:seed
```

---

## Environment Variables

The application reads configuration from `.env`. The example file contains all required variables:

```
DATABASE_URL="postgresql://user:password@localhost:5432/events_db"
DIRECT_DATABASE_URL="postgresql://user:password@localhost:5432/events_db"
JWT_SECRET="replace-with-a-long-random-secret"
SEED_ADMIN_PASSWORD="replace-with-a-strong-local-admin-password"
PORT=3000
```

- `DATABASE_URL` – connection string for Prisma.
- `DIRECT_DATABASE_URL` – used by `PrismaService` for direct connections.
- `JWT_SECRET` – secret key for signing JWT tokens.
- `SEED_ADMIN_PASSWORD` – password for the initial admin user created by the seed script.
- `PORT` – HTTP port the server listens on.

---

## Database Schema

The schema is defined in `prisma/schema.prisma`. Below is a concise overview of each model and its relationships.

### User

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) | Auto‑increment |
| username | String | Unique |
| email | String | Unique |
| passwordHash | String | Hashed password |
| roles | String[] | e.g., `["admin"]` |
| active | Boolean | Default `true` |
| status | UserStatus | `PENDING`, `APPROVED`, `REJECTED` |
| firstName, lastName, phone, address, city, country, lat, lng, afm | Optional | Profile data |
| createdAt, updatedAt | DateTime | Timestamps |
| organizedEvents | Relation | Events where user is organizer |
| bookings | Relation | Bookings made by user |
| views | Relation | Event views |
| sentMessages, receivedMessages | Relation | Messaging |

### Category

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) |
| name | String | Unique |
| events | Relation | Events belonging to category |

### Event

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) |
| eventId | String | Unique external ID |
| title, eventType, venue, address, city, country | String |
| lat, lng | Float? |
| startDateTime, endDateTime | DateTime |
| capacity | Int |
| status | EventStatus | `DRAFT`, `PUBLISHED`, `COMPLETED`, `CANCELLED` |
| description | String |
| organizerId | Int | FK to User |
| categories | Relation | Many‑to‑many via implicit join |
| ticketTypes | Relation | Ticket types for event |
| bookings | Relation | Bookings for event |
| photos | Relation | Event photos |
| views | Relation | Event views |
| messages | Relation | Messages related to event |
| createdAt, updatedAt | DateTime |

### TicketType

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) |
| ticketTypeId | String |
| eventId | Int | FK to Event |
| name | String |
| price | Decimal |
| quantity | Int |
| available | Int |
| bookings | Relation | Bookings for this ticket type |
| Unique constraint on `(eventId, ticketTypeId)` |

### Booking

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) |
| bookingId | String | Unique |
| eventId | Int | FK to Event |
| attendeeId | Int | FK to User |
| time | DateTime | Default `now()` |
| ticketTypeId | Int | FK to TicketType |
| numberOfTickets | Int |
| totalCost | Decimal |
| status | BookingStatus | `PENDING`, `CONFIRMED`, `CANCELLED` |
| Indexes on `eventId`, `attendeeId` |

### Photo

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) |
| eventId | Int | FK to Event |
| url | String |

### Message

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) |
| senderId | Int | FK to User |
| recipientId | Int | FK to User |
| eventId | Int? | FK to Event (nullable) |
| subject, body | String |
| sentAt | DateTime | Default `now()` |
| readAt | DateTime? |
| deletedBySender, deletedByRecipient | Boolean |
| Indexes on `senderId`, `recipientId` |

### EventView

| Field | Type | Notes |
|-------|------|-------|
| id | Int (PK) |
| userId | Int | FK to User |
| eventId | Int | FK to Event |
| viewedAt | DateTime | Default `now()` |
| Indexes on `userId`, `eventId` |

---

## Running the Application

```bash
# Development mode (auto‑reload)
npm run start:dev

# Production build
npm run build
node dist/main
```

The server will start on the port defined in `.env` (default `3000`).  
API base URL: `http://localhost:3000/api` (adjust if you add a prefix).

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `build` | Compile TypeScript to `dist/` |
| `format` | Run Prettier on source files |
| `start` | Start compiled server |
| `start:dev` | Start NestJS in watch mode |
| `start:debug` | Start with debugger |
| `start:prod` | Run compiled server |
| `lint` | ESLint with auto‑fix |
| `test` | Run unit tests (Jest) |
| `test:watch` | Watch mode for tests |
| `test:cov` | Test coverage report |
| `test:debug` | Debug tests |
| `test:e2e` | End‑to‑end tests |
| `prisma:seed` | Seed database (creates admin user) |
| `prisma:import-dataset` | Import dataset script |

---

## API Endpoints

> All endpoints are prefixed with `/api` (configurable in `main.ts`).  
> Authentication is required for all routes except `/auth/login` and `/auth/register`.  
> JWT is sent in the `Authorization: Bearer <token>` header.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/login` | Login, returns JWT |
| `POST` | `/auth/register` | Register new user |
| `PATCH` | `/auth/users/:id/approve` | Approve user (admin only) |
| `PATCH` | `/auth/users/:id/reject` | Reject user (admin only) |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users` | List users (admin only) |
| `GET` | `/users/:id` | Get user details (admin only) |
| `PATCH` | `/users/:id` | Update user (admin only) |
| `DELETE` | `/users/:id` | Delete user (admin only) |

### Events

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/events` | Create event (organizer) |
| `GET` | `/events` | List events (public) |
| `GET` | `/events/:id` | Get event details |
| `PATCH` | `/events/:id` | Update event (organizer) |
| `DELETE` | `/events/:id` | Delete event (organizer) |
| `PATCH` | `/events/:id/publish` | Publish event (organizer) |
| `PATCH` | `/events/:id/cancel` | Cancel event (organizer) |

### Bookings

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/bookings` | Create booking (participant) |
| `GET` | `/bookings` | List bookings (user) |
| `PATCH` | `/bookings/:id/cancel` | Cancel booking (user) |

### Messaging

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/messages` | Send message |
| `GET` | `/messages/inbox` | List received messages |
| `GET` | `/messages/sent` | List sent messages |
| `DELETE` | `/messages/:id` | Delete message |

> Detailed Swagger/OpenAPI documentation is auto‑generated by NestJS and available at `/api/docs` after running the server.

---

## Deployment

1. **Build**: `npm run build`
2. **Set environment variables** in the target environment (e.g., Docker secrets, Kubernetes ConfigMap).
3. **Run**: `node dist/main`
4. **Database**: Ensure PostgreSQL is reachable and migrations are applied (`npx prisma migrate deploy`).

### Docker (example)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
CMD ["node", "dist/main"]
```

---

## Testing

Run unit tests:

```bash
npm test
```

Run end‑to‑end tests:

```bash
npm run test:e2e
```

Generate coverage report:

```bash
npm run test:cov
```

---

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/xyz`).
3. Commit your changes with clear messages.
4. Run tests and linting (`npm run test && npm run lint`).
5. Open a pull request.

All contributions must follow the coding style enforced by ESLint and Prettier.

---

## License

This project is licensed under the MIT License – see the [LICENSE](LICENSE) file for details.

---

## Acknowledgements

- NestJS framework
- Prisma ORM
- PostgreSQL
- OpenStreetMap (for event location maps)
- DTD specification provided in the assignment
