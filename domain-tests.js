// Hidden canonical solutions for the 20 reusable domain challenge patterns.
// Candidate and canonical SQL are evaluated on separate fresh PGlite databases.
window.domainTestDefinition = function(number, domain) {
  const context = {
    banking: { fk: 'account_id', date: 'transaction_at' },
    healthcare: { fk: 'patient_id', date: 'scheduled_at' },
    retail: { fk: 'customer_id', date: 'ordered_at' },
    workforce: { fk: 'employee_id', date: 'paid_on' },
    travel: { fk: 'traveler_id', date: 'booked_at' },
    streaming: { fk: 'user_id', date: 'watched_at' },
    logistics: { fk: 'shipment_id', date: 'occurred_at' },
    education: { fk: 'student_id', date: 'enrolled_at' },
    hospitality: { fk: 'guest_id', date: 'checked_in_at' }
  }[domain.key];
  const p = domain.primary, r = domain.related, fk = context.fk, date = context.date;
  const definitions = {
    '01': ['Return all columns from the primary table, ordered by <code>id</code>.', `SELECT * FROM ${p} ORDER BY id`],
    '02': ['Return all primary records with an <code>id</code> greater than 1, ordered by <code>id</code>.', `SELECT * FROM ${p} WHERE id > 1 ORDER BY id`],
    '03': ['Return the three most recent activity records, ordered by date descending and then <code>id</code> descending.', `SELECT * FROM ${r} ORDER BY ${date} DESC, id DESC LIMIT 3`],
    '04': ['Return one row named <code>total</code> containing the number of primary records.', `SELECT COUNT(*) AS total FROM ${p}`],
    '05': [`Return the <code>id</code> of every ${domain.entity} with no related ${r} record, ordered by id.`, `SELECT p.id FROM ${p} p LEFT JOIN ${r} r ON r.${fk}=p.id WHERE r.id IS NULL ORDER BY p.id`],
    '06': [`Return every ${domain.entity} id and its <code>event_count</code>, including zero-activity entities, ordered by id.`, `SELECT p.id, COUNT(r.id) AS event_count FROM ${p} p LEFT JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id ORDER BY p.id`],
    '07': [`Return only ${domain.entityPlural} with activity: <code>id</code> and <code>event_count</code>, ordered by id.`, `SELECT p.id, COUNT(r.id) AS event_count FROM ${p} p JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id ORDER BY p.id`],
    '08': [`Return ids whose activity count is above the average activity count across all ${domain.entityPlural}, ordered by id.`, `WITH counts AS (SELECT p.id, COUNT(r.id) AS event_count FROM ${p} p LEFT JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id) SELECT id FROM counts WHERE event_count > (SELECT AVG(event_count) FROM counts) ORDER BY id`],
    '09': ['Return activity from the 30 days ending on the latest activity date in this dataset, ordered by date and id.', `SELECT * FROM ${r} WHERE ${date} >= (SELECT MAX(${date}) - INTERVAL '30 days' FROM ${r}) ORDER BY ${date}, id`],
    '10': [`Return every ${domain.entity} id, its event count, and <code>activity_rank</code> using DENSE_RANK ordered by count descending then id.`, `WITH counts AS (SELECT p.id, COUNT(r.id) AS event_count FROM ${p} p LEFT JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id) SELECT id, event_count, DENSE_RANK() OVER (ORDER BY event_count DESC) AS activity_rank FROM counts ORDER BY activity_rank, id`],
    '11': ['Return monthly activity counts with the previous month count using <code>LAG()</code>, ordered by month.', `WITH monthly AS (SELECT DATE_TRUNC('month', ${date})::date AS month, COUNT(*) AS event_count FROM ${r} GROUP BY 1) SELECT month, event_count, LAG(event_count) OVER (ORDER BY month) AS previous_month_count FROM monthly ORDER BY month`],
    '12': [`Return ids with more than one related record and their <code>event_count</code>, ordered by id.`, `SELECT p.id, COUNT(r.id) AS event_count FROM ${p} p JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id HAVING COUNT(r.id) > 1 ORDER BY p.id`],
    '13': [`Segment every ${domain.entity} as None, One, or Repeat based on activity count. Return <code>activity_segment</code> and <code>entity_count</code>, ordered alphabetically.`, `WITH counts AS (SELECT p.id, COUNT(r.id) AS event_count FROM ${p} p LEFT JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id), segmented AS (SELECT CASE WHEN event_count=0 THEN 'None' WHEN event_count=1 THEN 'One' ELSE 'Repeat' END AS activity_segment FROM counts) SELECT activity_segment, COUNT(*) AS entity_count FROM segmented GROUP BY activity_segment ORDER BY activity_segment`],
    '14': [`Return the first activity for each ${domain.entity}: <code>id</code>, <code>event_id</code>, and <code>event_date</code>, ordered by id.`, `WITH ranked AS (SELECT p.id, r.id AS event_id, r.${date} AS event_date, ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY r.${date},r.id) AS rn FROM ${p} p JOIN ${r} r ON r.${fk}=p.id) SELECT id,event_id,event_date FROM ranked WHERE rn=1 ORDER BY id`],
    '15': [`Return up to three latest activities per ${domain.entity}: <code>id</code>, <code>event_id</code>, and <code>event_date</code>. Order by id then event date descending.`, `WITH ranked AS (SELECT r.${fk} AS id,r.id AS event_id,r.${date} AS event_date,ROW_NUMBER() OVER (PARTITION BY r.${fk} ORDER BY r.${date} DESC,r.id DESC) AS rn FROM ${r} r) SELECT id,event_id,event_date FROM ranked WHERE rn<=3 ORDER BY id,event_date DESC,event_id DESC`],
    '16': [`Return every ${domain.entity} id and <code>latest_event_date</code>, including entities with no activity, ordered by id.`, `SELECT p.id, MAX(r.${date}) AS latest_event_date FROM ${p} p LEFT JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id ORDER BY p.id`],
    '17': ['Return monthly cohorts: <code>cohort_month</code>, <code>activity_month</code>, and distinct <code>entity_count</code>, ordered by cohort and activity month.', `WITH first_activity AS (SELECT ${fk} AS id, DATE_TRUNC('month',MIN(${date}))::date AS cohort_month FROM ${r} GROUP BY ${fk}), activity AS (SELECT ${fk} AS id,DATE_TRUNC('month',${date})::date AS activity_month FROM ${r} GROUP BY ${fk},DATE_TRUNC('month',${date})::date) SELECT f.cohort_month,a.activity_month,COUNT(DISTINCT a.id) AS entity_count FROM first_activity f JOIN activity a ON a.id=f.id GROUP BY f.cohort_month,a.activity_month ORDER BY f.cohort_month,a.activity_month`],
    '18': [`Return activity id, ${domain.entity} id, event date, and a <code>running_event_count</code> per ${domain.entity}, ordered by id and event date.`, `SELECT id,${fk} AS entity_id,${date} AS event_date,COUNT(*) OVER (PARTITION BY ${fk} ORDER BY ${date},id) AS running_event_count FROM ${r} ORDER BY ${fk},${date},id`],
    '19': [`Return activity records that occur exactly one day after the same ${domain.entity}'s prior activity: <code>id</code>, <code>event_id</code>, <code>event_date</code>, ordered by id and date.`, `WITH sequenced AS (SELECT ${fk} AS id,id AS event_id,${date} AS event_date,LAG(${date}) OVER (PARTITION BY ${fk} ORDER BY ${date},id) AS previous_event_date FROM ${r}) SELECT id,event_id,event_date FROM sequenced WHERE event_date=previous_event_date + INTERVAL '1 day' ORDER BY id,event_date,event_id`],
    '20': [`Return each ${domain.entity} id, event count, and its <code>overall_rank</code> by event count descending. Order by rank then id.`, `WITH counts AS (SELECT p.id,COUNT(r.id) AS event_count FROM ${p} p LEFT JOIN ${r} r ON r.${fk}=p.id GROUP BY p.id) SELECT id,event_count,DENSE_RANK() OVER (ORDER BY event_count DESC) AS overall_rank FROM counts ORDER BY overall_rank,id`]
  };
  const [objective, expectedQuery] = definitions[number];
  return { objective, expectedQuery };
};
