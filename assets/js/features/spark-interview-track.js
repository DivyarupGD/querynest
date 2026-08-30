// Spark-only interview exercises. They use local files and never affect PostgreSQL progress.
const sparkTrackTopics = [
  ['Read CSV with schema', 'Read customers.csv with header and inferred types; return the first 20 rows.', 'DATA SOURCES'],
  ['Read newline JSON', 'Read events.json and select user_id, event_type, and event_at.', 'DATA SOURCES'],
  ['Write Parquet', 'Read orders.csv, write it as Parquet locally, then read the Parquet output.', 'PARQUET'],
  ['Filter and select', 'Filter paid orders with amount above 500, selecting only the required columns.', 'TRANSFORMATIONS'],
  ['Column expressions', 'Create a derived amount band with when/otherwise.', 'COLUMNS'],
  ['Null handling', 'Use coalesce and fill to make nullable output safe.', 'NULLS'],
  ['Deduplicate events', 'Keep one event per user_id and event_at using dropDuplicates.', 'DEDUPLICATION'],
  ['Union compatible data', 'Union two compatible event DataFrames with unionByName.', 'UNION'],
  ['Inner and outer joins', 'Join customers and orders, comparing inner and left results.', 'JOINS'],
  ['Broadcast dimension join', 'Use broadcast() for the small customers dimension.', 'BROADCAST'],
  ['Anti join', 'Return customers with no paid order using left_anti.', 'JOINS'],
  ['Group and aggregate', 'Compute order count and total amount by customer segment.', 'AGGREGATIONS'],
  ['Pivot report', 'Pivot order status by customer segment.', 'PIVOT'],
  ['Explode nested JSON', 'Parse the events payload and explode a nested collection you create.', 'COMPLEX TYPES'],
  ['Date functions', 'Use to_date, date_trunc, and datediff for monthly activity.', 'DATES'],
  ['Parse event timestamps', 'Read event_at as a timestamp with to_timestamp using an explicit format; return the parsed timestamp.', 'TIMESTAMPS'],
  ['Timezone normalisation', 'Convert event timestamps from their source timezone to UTC and explain why session timezone matters.', 'TIMEZONES'],
  ['Time-window aggregation', 'Group events into one-hour windows with window() and count events per window.', 'TIME WINDOWS'],
  ['Timestamp sessionisation', 'Use lag() and timestamp differences to begin a new session after 30 minutes of inactivity.', 'TIMESTAMPS'],
  ['Window ranking', 'Rank each customer’s orders by amount with dense_rank.', 'WINDOWS'],
  ['Lag and lead', 'Compare each event to the prior event for the same user.', 'WINDOWS'],
  ['Running total', 'Add a running amount per customer using a window.', 'WINDOWS'],
  ['Cohort analysis', 'Build a customer first-order-month cohort table.', 'ANALYTICS'],
  ['UDF versus built-ins', 'Implement a small UDF, then replace it with a built-in expression.', 'UDFS'],
  ['RDD conversion', 'Convert a small DataFrame to an RDD and back with an explicit schema.', 'RDD'],
  ['Repartition and coalesce', 'Inspect partition counts before and after repartition/coalesce.', 'PARTITIONS'],
  ['Cache and persist', 'Cache a reused aggregation and explain when to unpersist it.', 'CACHING'],
  ['Explain a plan', 'Use explain(true) and identify scan, exchange, and join stages.', 'CATALYST'],
  ['Partition pruning', 'Write Parquet partitioned by status and read one status efficiently.', 'OPTIMISATION'],
  ['Data skew', 'Measure customer key skew and propose salting for a hot key.', 'SKEW'],
  ['Shuffle reduction', 'Reduce shuffles by pre-aggregating before a join.', 'PERFORMANCE'],
  ['Structured Streaming design', 'Describe a file-stream input, watermark, and checkpoint strategy.', 'STREAMING'],
  ['Test a transformation', 'Create a tiny DataFrame and assert expected transformed rows.', 'TESTING'],
  ['Capstone pipeline', 'Read CSV and JSON, validate, join, aggregate, write Parquet, and inspect the plan.', 'CAPSTONE']
];

const sparkTrackProblems = sparkTrackTopics.map(([title, prompt, tag], index) => ({
  id: `SP${String(index + 1).padStart(2, '0')}`,
  title: `Spark: ${title}`,
  level: index < 8 ? 'Easy' : index < 20 ? 'Medium' : 'Hard',
  tag,
  sparkDomain: 'retail',
  desc: `<p>${prompt}</p><p>Use the local sources in <code>queryNestDataRoot</code>. This challenge runs only with Spark Scala.</p>`,
  example: 'Local files:\ncustomers/customers.csv\norders/orders.csv\nevents/events.json\n\nBase path: queryNestDataRoot',
  query: '',
  schema: [],
  hint: 'Start with a read, inspect the schema, and return the DataFrame you want to verify.'
}));

function showSparkTrack() {
  document.body.classList.remove('domains-mode', 'progress-mode');
  document.body.classList.add('practice-mode');
  document.querySelector('.content-grid').hidden = true;
  document.querySelector('#domainView').hidden = true;
  document.querySelector('#progressView').hidden = true;
  const view = document.querySelector('#sparkTrackView');
  view.hidden = false;
  document.querySelector('#crumbTitle').textContent = 'Spark interview track';
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.querySelector('#sparkTrackLink').classList.add('active');
  view.innerHTML = `<div class="domain-intro"><div><div class="eyebrow">LOCAL SPARK SCALA</div><h1>Spark interview track</h1><p>${sparkTrackProblems.length} practical challenges: files, timestamps, DataFrames, performance, and production patterns.</p></div><div class="library-count"><b>${sparkTrackProblems.length}</b><span>Spark challenges</span></div></div><div class="spark-track-grid">${sparkTrackProblems.map(problem => `<button class="spark-track-card" data-spark-problem="${problem.id}"><b>${problem.tag}</b><h2>${problem.title.replace('Spark: ', '')}</h2><p>${problem.desc.replace(/<[^>]+>/g, '')}</p><span>Open challenge →</span></button>`).join('')}</div>`;
  view.querySelectorAll('[data-spark-problem]').forEach(button => button.onclick = () => {
    const problem = sparkTrackProblems.find(item => item.id === button.dataset.sparkProblem);
    if (!problems.some(item => item.id === problem.id)) problems.push(problem);
    view.hidden = true;
    document.querySelector('.content-grid').hidden = false;
    loadProblem(problems.findIndex(item => item.id === problem.id));
    setEngine('spark');
  });
}

document.querySelector('#sparkTrackLink').onclick = event => { event.preventDefault(); showSparkTrack(); };
