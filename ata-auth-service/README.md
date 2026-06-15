# ata-auth-service

NestJS authentication microservice for the Ata platform.

## Features

- **Registration** with argon2id password hashing + email verification
- **Login** with JWT (RS256) access tokens (15 min) + opaque refresh tokens (7 days)
- **Refresh token rotation** with reuse detection (full session revocation on reuse)
- **Email verification** and **password reset** flows (MailHog in dev, real SMTP in prod)
- **OAuth** – Google & GitHub (Passport strategies, code complete, needs credentials)
- **Rate limiting** – Redis sliding-window per IP on `/auth/login` and `/auth/register`
- **Audit logging** – every auth event persisted to `auth.audit_logs`
- **Internal API** – `POST /auth/internal/validate-token` for gateway/services

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11 |
| Database | PostgreSQL 16 (Drizzle ORM) |
| Session store | Redis 7 (ioredis) |
| Password hashing | argon2id |
| JWT | RS256 asymmetric keys |
| Email | Nodemailer + MailHog (dev) |
| Validation | class-validator + Zod (env) |

## Quick Start

### 1. Generate RS256 key pair

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
export JWT_PRIVATE_KEY=$(base64 -i private.pem)
export JWT_PUBLIC_KEY=$(base64 -i public.pem)
```

### 2. Copy and fill env

```bash
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, JWT_PRIVATE_KEY, JWT_PUBLIC_KEY
```

### 3. Start dependencies (from root)

```bash
docker compose up postgres redis mailhog -d
```

### 4. Run migrations

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start dev server

```bash
npm run start:dev
```

The service runs on `http://localhost:3001`.

## API

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email + password |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/refresh` | Rotate refresh token |
| GET  | `/auth/me` | Get current user (JWT required) |
| POST | `/auth/verify-email` | Consume email verification token |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/reset-password` | Consume reset token + set new password |
| GET  | `/auth/oauth/google` | Initiate Google OAuth |
| GET  | `/auth/oauth/google/callback` | Google OAuth callback |
| GET  | `/auth/oauth/github` | Initiate GitHub OAuth |
| GET  | `/auth/oauth/github/callback` | GitHub OAuth callback |
| POST | `/auth/internal/validate-token` | Internal: validate JWT (API key required) |

## Testing

```bash
# Unit tests
npm test

# E2E tests (requires Postgres + Redis)
npm run test:e2e

# Coverage
npm run test:cov
```

## Database

Schemas managed by Drizzle ORM:
- `auth.users`
- `auth.refresh_tokens`
- `auth.email_verification_tokens`
- `auth.audit_logs`

```bash
# Generate migrations after schema changes
npm run db:generate

# Apply migrations
npm run db:migrate
```
