# QueryNest

QueryNest is an invite-only SQL interview-practice app. Learner queries run against isolated PostgreSQL-compatible datasets in the browser, while Supabase stores accounts and progress.

## Free production stack

- **Cloudflare Pages** hosts this static web app at a free `pages.dev` address.
- **Supabase** supplies PostgreSQL and authentication for user accounts, problem content, and progress.
- **PGlite** runs each practice question's PostgreSQL data set locally in the browser.

## Local preview

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. An internet connection is needed the first time because PGlite is loaded from its public package CDN.

### Local Spark Scala runner (optional)

Spark Scala is deliberately a local-only feature. It is not deployed to Cloudflare and it does not send code or datasets to Supabase. Start the static site first, then in a second terminal start the runner with your locally installed Spark shell:

```bash
SPARK_SHELL=/path/to/spark-shell node local-spark-runner/server.js
```

For this machine, the installed shell is:

```bash
SPARK_SHELL=/Users/divyarupghoshdastidar/Documents/spark-2.4.4-bin-hadoop2.6/bin/spark-shell node local-spark-runner/server.js
```

In QueryNest, select **Spark Scala — local computer only**. The editor provides imports, domain DataFrames, and a `result: DataFrame` wrapper; write only the transformation logic inside that wrapper. The runner listens only on `127.0.0.1:8788` and creates temporary local fixture data for each execution. It keeps one Spark session warm: the first run after starting the runner can take about 30 seconds, while later runs reuse that session and are much faster.

## Planned data model

The Supabase database will hold `profiles`, `domains`, `datasets`, `problems`, `problem_test_cases`, `user_progress`, and `saved_queries`. Each `problem` belongs to a reusable domain dataset (for example, the banking tables `customers`, `accounts`, and `transactions`).

Do not put Supabase service-role credentials in the browser. The client only uses the public anonymous key with row-level security enabled.

## Project structure

```text
assets/
  css/                 Presentation styles, grouped by feature
  js/
    app.js             Core editor, query execution, and authentication
    config.js          Public Supabase configuration
    features/          Domain labs, grading, progress, schema view, navigation
local-spark-runner/
  server.js            Local-only Spark Scala execution service
supabase/
  schema.sql           Base tables, RLS policies, and profile trigger
  progress-migration.sql
index.html             Static application entry point
```

## Content model

- `domains.js` defines the domain datasets and table schemas.
- `dataset-augmentation.js` increases each dataset with realistic generated rows.
- `domain-tests.js` contains the hidden canonical query for each challenge pattern.
- `difficulty-balance.js` assigns each domain path its Easy, Medium, Hard, and Super Hard mix.
