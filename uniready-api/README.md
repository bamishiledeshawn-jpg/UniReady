# uniready-api

Backend for UniReady. Go + Gin + Postgres (via pgx).

## Getting started

You'll need Go 1.22+ and a Postgres database (a free tier on Neon or Supabase
works fine to start — no need to self-host).

```bash
cp .env.example .env
# fill in DATABASE_URL in .env

go mod tidy      # resolves and downloads all dependencies
go run ./cmd/api
```

You should see:
```
uniready-api listening on :8080 (development)
```

Check it's actually working end-to-end (server + DB connection):
```bash
curl http://localhost:8080/health
```

## Running the migration

The first migration creates the `users`, `otp_codes`, and `sessions` tables
— the minimum needed for phone+OTP auth. Run it against your database with
whatever tool you're comfortable with:

```bash
psql "$DATABASE_URL" -f migrations/0001_init.sql
```

(A proper migration tool like `golang-migrate` is worth adopting once
there's more than one or two migration files — for now, running the SQL
directly is simpler and there's nothing to configure.)

## Project structure

```
cmd/api/main.go          entry point — loads config, connects DB, starts server
internal/config/         environment variable loading
internal/database/       Postgres connection pool setup
internal/server/         Gin router + middleware wiring
internal/server/handlers/  HTTP handlers, grouped by feature
internal/middleware/     shared middleware (rate limiting, auth, etc.)
migrations/              raw SQL migrations, applied in order
```

Everything under `internal/` is private to this module — Go enforces that
other projects can't import it, which is what you want for an API backend
(nothing here is a shared library).

## Why these choices

- **Gin** over the standard library or a heavier framework: minimal, fast,
  huge ecosystem, easy to reason about. Not choosing anything more exotic —
  boring and well-understood beats clever here.
- **pgx** over `database/sql` + a generic driver: it's the standard choice
  for Postgres in Go, faster, and the pool (`pgxpool`) handles connection
  management for you.
- **No ORM.** At this stage, hand-written SQL with pgx is more transparent
  and easier to debug than an ORM's generated queries. Worth reconsidering
  only if the schema gets large enough that raw SQL becomes tedious — not a
  concern yet.
- **In-memory rate limiter, not Redis, for now.** Redis is in the original
  architecture plan for caching and session queues, but adding it before
  there's a real need is premature. The in-memory limiter in
  `internal/middleware/ratelimit.go` works fine for a single running
  instance. The moment you run more than one instance behind a load
  balancer, swap this for Redis — it's flagged in a comment in that file so
  it isn't forgotten.

## What's next

This scaffold has one real endpoint (`/health`) so you have something to
build against and deploy immediately. The natural next step is phone+OTP
auth, since almost every other feature (dashboard data, practice sessions,
voucher redemption) needs a logged-in user to attach data to.
