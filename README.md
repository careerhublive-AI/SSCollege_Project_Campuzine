# Sree Sabareesa College: website + Sabari (Phase 1 demo)

A working management demo of the new college website, built to the project blueprint:

- **Public website** driven by a CMS: Home, About, Management, Departments, Programmes, Admissions, Faculty directory, Research, Student achievements, News & Events, IQAC, NAAC, Committees, Infrastructure, Library, NSS, Alumni, Mandatory Disclosures, Contact.
- **Sabari Phase 1**, the bilingual (English + Malayalam) virtual assistant: quick-action topics, typed questions, keyword and synonym matching over published FAQs only, a "no verified answer" fallback with *Contact College* and *Submit Your Question*, and no paid AI.
- **Admin panel** with role-based access: pages, news/events/notices, homepage banner, departments and programmes, college information, users and approvals, audit log, and Sabari management (dashboard, FAQ management, topics and quick replies, unanswered questions with Convert to FAQ, chat history, languages and settings, and a test console).

Stack: Node.js 20+ · Express · EJS + Bootstrap 5 · MySQL (utf8mb4) through Knex. SQLite works for quick local runs.

## Run locally

```bash
npm install
npm start            # http://localhost:3000, using SQLite in ./data by default
```

On the first start the app creates the tables and loads starter content. It prints a temporary Super Admin password unless `ADMIN_PASSWORD` is set. Sign in at `/admin`.

`npm test` runs the Sabari matching tests, which use the example questions from the blueprint.

## Deploy on Hostinger (Business plan, Node.js Web App)

1. **Create a MySQL database** in hPanel → Databases. Note the database name, user and password.
2. **Create the Node.js web app** in hPanel (the exact menu names may differ slightly). Either connect the GitHub repository or upload the project zip, which must not include `node_modules`.
   - Framework: **Express**. Node.js version: **22.x**. Entry file: **server.js**. Install command: `npm install`. Start command: `npm start`.
3. **Set the environment variables** listed in `.env.example`: `NODE_ENV=production`, a long random `SESSION_SECRET`, `DB_CLIENT=mysql` with the database details, and `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the first Super Admin.
4. **Deploy.** On the first start the app creates every table and loads the starter content. Nothing else needs to run.
5. Open `https://<your-domain>/admin`, sign in, and change the password under *My account*.

Temporary domain for the demo: `flexible-mediumorchid-stork-34.hostingersite.com`.

## Starter content is placeholder

Everything marked *sample* or *to be confirmed* must be replaced with official information. That includes departments, programmes, address, phone, email, affiliation, page text and news. Sabari's FAQs only point visitors to pages and never state unverified facts. Contact answers use `{{address}}`, `{{phone}}`, `{{email}}` and `{{office_hours}}` from *College information*, so they stay current.

## Security

- Passwords hashed with bcrypt. Sessions are stored in the database, with secure, HTTP-only, SameSite cookies.
- CSRF tokens on every admin form. Origin checks, JSON-only bodies and rate limits on the public Sabari API. Login attempts are rate limited.
- Helmet security headers with a strict Content Security Policy. Admin-entered HTML is sanitised.
- Role-based permissions (Super Admin, Principal, IQAC Coordinator, HOD, Department Coordinator, Website Admin, Office Admin, Faculty, Staff, Student). Suspended accounts are signed out on their next request.
- An audit log records logins, failed logins, and every create, update, delete and status change.
- Sabari only ever reads published FAQs, never reads private records, and does not ask for personal data. Chat history is deleted automatically after the retention period, which defaults to 90 days.

## Moving to Django + PostgreSQL later

The schema follows Django conventions: integer `id` primary keys, `snake_case` names, `*_id` foreign keys, `created_at`/`updated_at`, an academic year on dated records, and roles and permissions in tables. The tables map one-to-one onto Django models, so the data can be exported and loaded into the final system. Sabari's widget calls a small JSON API (`/api/sabari/*`), so the final backend only needs to serve the same endpoints for the widget to keep working unchanged.

## Project layout

```
server.js                 entry point (migrations + first-run content + server)
knexfile.js               database configuration (MySQL / SQLite)
migrations/               table definitions (core + Sabari)
seeds/                    starter content (skipped once data exists)
src/app.js                Express app, security headers, sessions
src/routes/               public site, admin, Sabari API, Sabari admin
src/controllers/          Sabari API controller
src/services/             matching, FAQ, conversations, settings, audit, text helpers
views/                    EJS templates (public + admin)
public/sabari/            the Sabari widget (sabari.js + sabari.css)
test/                     Sabari matching tests
```

## Not yet built (later blueprint phases)

Self-registration with approval (Phase 3), the Faculty and Staff portal (4), the Student portal (5), department dashboards (6), the IQAC/NAAC portal (7), reporting (8), autonomous-mode modules, and Sabari Phase 2 (AI + documents).
