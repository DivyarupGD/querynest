# QueryNest

QueryNest is an invite-only SQL practice app for two users. Learner queries run against an isolated PostgreSQL-compatible database in the browser, so the application database is never exposed to arbitrary SQL.

## Free production stack

- **Cloudflare Pages** hosts this static web app at a free `pages.dev` address.
- **Supabase** supplies PostgreSQL and authentication for user accounts, problem content, and progress.
- **PGlite** runs each practice question's PostgreSQL data set locally in the browser.

## Local preview

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. An internet connection is needed the first time because PGlite is loaded from its public package CDN.

## Planned data model

The Supabase database will hold `profiles`, `domains`, `datasets`, `problems`, `problem_test_cases`, `user_progress`, and `saved_queries`. Each `problem` belongs to a reusable domain dataset (for example, the banking tables `customers`, `accounts`, and `transactions`).

Do not put Supabase service-role credentials in the browser. The client only uses the public anonymous key with row-level security enabled.
