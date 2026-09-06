# Jess Ford Floor CRM

Sales-floor customer CRM for Jess Ford dealerships. Milestone 1: Today queue, quick-add, search, lead detail, stub messaging, appointments, and test drives.

Built for the floor (not BDC). All salespeople can see all leads. **Today** is your task list.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS + shadcn/ui
- SQLite + Prisma (swap `provider` + `DATABASE_URL` to move to Postgres later)
- **Auth is stub/demo only** — seeded salespeople, pick who you are in the header. Structure is ready to replace with real auth. **Not production.**
- **Messaging is provider-agnostic** — `MessageProvider` with `sendSms` / `sendEmail`. The stub logs and audits; no Twilio yet.

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`prisma migrate dev` applies the schema and can run the seed when prompted. `prisma db seed` always reseeds sample salespeople and leads.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm test` | Domain-rule unit tests |
| `npm run db:migrate` | Prisma migrate |
| `npm run db:seed` | Reseed demo data |
| `npm run db:reset` | Reset SQLite + migrate + seed |

## Demo login

There is no password. Use **On the floor as** in the header to switch among seeded salespeople (Garrett Jess, Maya Chen, Derek Holt, Sofia Ramirez). The server reads the session cookie and **never trusts a client `actorId`**.

## Product rules (M1)

- Everyone sees every lead. Today defaults to **Mine**; **All** shows the floor.
- One primary owner. Reassign moves **open** tasks to the new owner, stays on the lead, and toasts `Owner → Name` (plus `off Mine list` when it leaves your queue).
- Statuses: `new → working → appt set → sold / lost / dead`
- First logged activity or outbound send auto-promotes **new → working**
- Quick-add soft-requires a next touch (chips + **Skip once**). Save is never blocked for skipping.
- One open next-task per lead
- Lost / Dead require a reason and cancel open tasks
- Sold is allowed from Working without an appointment
- Phone or email required (`Phone or email required`)
- Opt-out blocks SMS/email **server-side**. Log call / Add note still work. Sends are audited.
- Appointments: `scheduledAt`; Showed / No-show / Cancel / Reschedule. No-show → Working + **Call — rebook**. Showed can log a test drive.
- Test drive: vehicle, when, note; optional link to an open/showed appointment

## Out of scope (M1)

Real OAuth, real SMS, CSV import, Dealertrack, cadence automation, pipeline board, booking links, email sync, KPI strip, inventory picker.

## Replace later

| Stub | Swap point |
| --- | --- |
| Demo user picker | `src/lib/auth.ts` (`getCurrentUser`) and `switchUserAction` |
| SMS / email | `src/lib/messaging.ts` (`MessageProvider` / `setMessageProvider`) |
| SQLite | `prisma/schema.prisma` `datasource` + `DATABASE_URL` |
