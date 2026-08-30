// Optional local Spark Scala workspace. The runner only listens on this computer.
const SPARK_RUNNER_URL = 'http://127.0.0.1:8788';
let querynestEngine = 'postgres';
let sparkRunnerReady = false;
const postgresQuickReference = document.querySelector('#quickReference').innerHTML;

function setQuickReference(engine) {
  const reference = document.querySelector('#quickReference');
  reference.open = false;
  reference.innerHTML = engine === 'spark'
    ? `<summary><span>ϟ</span> Spark Scala & DataFrame reference <i>⌄</i></summary><div class="reference-grid"><div><b>Select & filter</b><code>df.select("id", "name")<br>df.filter(col("amount") &gt; 100)<br>df.limit(10)</code></div><div><b>Columns</b><code>df.withColumn("x", expr("a + b"))<br>df.withColumnRenamed("old", "new")<br>df.drop("unused")</code></div><div><b>Joins</b><code>left.join(right, Seq("id"), "left")<br>left.join(right, left("id") === right("id"))<br>"left_anti" for non-matches</code></div><div><b>Aggregations</b><code>df.groupBy("customer_id")<br>.agg(sum("amount"), count("id"))<br>.filter(col("count(id)") &gt; 1)</code></div><div><b>Windows</b><code>val w = Window.partitionBy("id")<br>.orderBy(col("event_at").desc)<br>row_number().over(w)</code></div><div><b>Dates & nulls</b><code>to_date(col("event_at"))<br>datediff(end, start)<br>coalesce(col("value"), lit(0))</code></div><div><b>Debug & output</b><code>df.show(20, false)<br>df.printSchema()<br>val result: DataFrame = df</code></div><div><b>Performance</b><code>df.repartition(8, col("id"))<br>df.cache()<br>broadcast(smallDimension)</code></div></div>`
    : postgresQuickReference;
}

function escapeSparkConsole(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function currentDomain() {
  const problem = problems[current];
  if (problem?.sparkDomain) return domains.find(domain => domain.key === problem.sparkDomain);
  const prefix = problem?.id?.slice(0, 2);
  return domains.find(domain => domain.key.slice(0, 2).toUpperCase() === prefix);
}

function sparkStarter(problem) {
  const domain = currentDomain();
  const tables = domain ? domain.tables.join(', ') : 'your tables';
  return `import org.apache.spark.sql.DataFrame
import org.apache.spark.sql.functions._
import org.apache.spark.sql.expressions.Window

// Available local DataFrames: ${tables}
// For a quick preview: ${domain?.primary || 'patients'}.show(10, false)
// The final line must return a DataFrame, for example: ${domain?.primary || 'patients'}.limit(10)
val result: DataFrame = {
  ${domain?.primary || 'patients'}.limit(10)
}`;
}

function sparkChallengeDetails(problem) {
  if (problem.id.startsWith('SP')) return null;
  const domain = currentDomain();
  if (!domain) return null;
  const number = problem.id.slice(-2);
  const p = domain.primary;
  const r = domain.related;
  const [fk, date] = { banking:['account_id','transaction_at'], healthcare:['patient_id','scheduled_at'], retail:['customer_id','ordered_at'], workforce:['employee_id','paid_on'], travel:['traveler_id','booked_at'], streaming:['user_id','watched_at'], logistics:['shipment_id','occurred_at'], education:['student_id','enrolled_at'], hospitality:['guest_id','checked_in_at'] }[domain.key];
  const lessons = {
    '01':['DATAFRAME BASICS', `Inspect <code>${p}</code> with <code>printSchema()</code> and <code>show()</code>, then return every row ordered by <code>id</code>.`],
    '02':['SELECT & FILTER', `Use <code>filter()</code> and <code>orderBy()</code> to return rows from <code>${p}</code> where <code>id &gt; 1</code>.`],
    '03':['SORT & LIMIT', `Use descending column expressions, <code>orderBy()</code>, and <code>limit()</code> to return the three latest <code>${r}</code> rows.`],
    '04':['ACTIONS & AGGREGATIONS', `Use <code>agg()</code> with <code>count()</code> to return one column named <code>total</code> for <code>${p}</code>.`],
    '05':['ANTI JOIN', `Use a <code>left_anti</code> join to return <code>${p}.id</code> values without a related <code>${r}</code> row.`],
    '06':['LEFT JOIN & GROUPBY', `Use a left join and <code>groupBy().agg()</code> to return every <code>${p}.id</code> and matching <code>${r}</code> count as <code>event_count</code>.`],
    '07':['INNER JOIN & ALIASES', `Use aliased DataFrames and an inner join. Return ids with matching <code>${r}</code> rows and their <code>event_count</code>.`],
    '08':['AGGREGATE THEN FILTER', `Build an aggregated DataFrame, calculate the average <code>event_count</code>, and return ids above that average.`],
    '09':['DATE FUNCTIONS', `Use <code>to_date()</code>, <code>max()</code>, and <code>datediff()</code> to return <code>${r}</code> rows from the latest 30 days.`],
    '10':['WINDOW RANKING', `Build counts and add <code>dense_rank().over(Window.orderBy(...))</code> as <code>activity_rank</code>.`],
    '11':['LAG WINDOW', `Aggregate <code>${r}</code> by month, then use <code>lag()</code> over a month window to add <code>previous_month_count</code>.`],
    '12':['GROUP FILTERING', `Use <code>groupBy().agg()</code> followed by <code>filter()</code> to keep ids with more than one related row.`],
    '13':['CONDITIONAL COLUMNS', `Use <code>when()</code>/<code>otherwise()</code> to classify event counts as None, One, or Repeat, then aggregate each segment.`],
    '14':['ROW_NUMBER WINDOW', `Use <code>row_number()</code> with <code>partitionBy()</code> to return the first related event per <code>${p}.id</code>.`],
    '15':['TOP-N PER GROUP', `Use a partitioned window and <code>row_number()</code> to return each <code>${r}.${fk}</code>'s three latest events.`],
    '16':['NULL-SAFE AGGREGATION', `Use a left join and <code>max()</code> to return every <code>${p}.id</code>, including rows whose latest event date is null.`],
    '17':['COHORT ANALYSIS', `Create an activity-month DataFrame, join it to each entity's first activity month, then aggregate the cohort matrix.`],
    '18':['RUNNING WINDOWS', `Use <code>count().over()</code> with a partitioned, ordered window to add <code>running_event_count</code>.`],
    '19':['GAPS & ISLANDS', `Use <code>lag()</code> and <code>datediff()</code> to identify <code>${r}</code> events exactly one day after the prior event for the same entity.`],
    '20':['INTERVIEW-READY REPORT', `Combine a join, aggregation, <code>dense_rank()</code>, and final ordering into one interview-style executive report. Use <code>explain()</code> while debugging to inspect its plan.`]
  };
  const [tag, instruction] = lessons[number] || lessons['01'];
  return { tag, description: `<p>${instruction}</p><p>Use the <b>Schema</b> tab to inspect the local DataFrames. Return your final DataFrame as <code>result</code>.</p>` };
}

function sparkReferenceAnswer(problem) {
  const domain = currentDomain();
  if (!domain) return sparkStarter(problem);
  const number = problem.id.slice(-2);
  const p = domain.primary;
  const r = domain.related;
  const [fk, date] = { banking:['account_id','transaction_at'], healthcare:['patient_id','scheduled_at'], retail:['customer_id','ordered_at'], workforce:['employee_id','paid_on'], travel:['traveler_id','booked_at'], streaming:['user_id','watched_at'], logistics:['shipment_id','occurred_at'], education:['student_id','enrolled_at'], hospitality:['guest_id','checked_in_at'] }[domain.key];
  const joinedCounts = `val counts = ${p}.as("p").join(${r}.as("r"), col("p.id") === col("r.${fk}"), "left").groupBy(col("p.id").as("id")).agg(count(col("r.id")).as("event_count"))`;
  const answers = {
    '01': `${p}.orderBy("id")`,
    '02': `${p}.filter(col("id") > 1).orderBy("id")`,
    '03': `${r}.orderBy(col("${date}").desc, col("id").desc).limit(3)`,
    '04': `${p}.agg(count(lit(1)).as("total"))`,
    '05': `${p}.as("p").join(${r}.as("r"), col("p.id") === col("r.${fk}"), "left_anti").select(col("p.id").as("id")).orderBy("id")`,
    '06': `{ ${joinedCounts}; counts.orderBy("id") }`,
    '07': `${p}.as("p").join(${r}.as("r"), col("p.id") === col("r.${fk}")).groupBy(col("p.id").as("id")).agg(count(col("r.id")).as("event_count")).orderBy("id")`,
    '08': `{ ${joinedCounts}; val averageCount = counts.agg(avg(col("event_count"))).first().getDouble(0); counts.filter(col("event_count") > averageCount).select("id").orderBy("id") }`,
    '09': `${r}.withColumn("_event_date", to_date(col("${date}"))).withColumn("_latest_date", max(col("_event_date")).over()).filter(datediff(col("_latest_date"), col("_event_date")) <= 30).drop("_event_date", "_latest_date").orderBy(col("${date}"), col("id"))`,
    '10': `{ ${joinedCounts}; counts.withColumn("activity_rank", dense_rank().over(Window.orderBy(col("event_count").desc))).orderBy("activity_rank", "id") }`,
    '11': `{ val monthly = ${r}.groupBy(trunc(to_date(col("${date}")), "month").as("month")).agg(count(lit(1)).as("event_count")); monthly.withColumn("previous_month_count", lag(col("event_count"), 1).over(Window.orderBy("month"))).orderBy("month") }`,
    '12': `${p}.as("p").join(${r}.as("r"), col("p.id") === col("r.${fk}")).groupBy(col("p.id").as("id")).agg(count(col("r.id")).as("event_count")).filter(col("event_count") > 1).orderBy("id")`,
    '13': `{ ${joinedCounts}; counts.withColumn("activity_segment", when(col("event_count") === 0, "None").when(col("event_count") === 1, "One").otherwise("Repeat")).groupBy("activity_segment").agg(count(lit(1)).as("entity_count")).orderBy("activity_segment") }`,
    '14': `${p}.as("p").join(${r}.as("r"), col("p.id") === col("r.${fk}")).withColumn("_row", row_number().over(Window.partitionBy(col("p.id")).orderBy(col("r.${date}"), col("r.id")))).filter(col("_row") === 1).select(col("p.id").as("id"), col("r.id").as("event_id"), col("r.${date}").as("event_date")).orderBy("id")`,
    '15': `${r}.withColumn("_row", row_number().over(Window.partitionBy(col("${fk}")).orderBy(col("${date}").desc, col("id").desc))).filter(col("_row") <= 3).select(col("${fk}").as("id"), col("id").as("event_id"), col("${date}").as("event_date")).orderBy(col("id"), col("event_date").desc, col("event_id").desc)`,
    '16': `${p}.as("p").join(${r}.as("r"), col("p.id") === col("r.${fk}"), "left").groupBy(col("p.id").as("id")).agg(max(col("r.${date}")).as("latest_event_date")).orderBy("id")`,
    '17': `{ val activity = ${r}.select(col("${fk}").as("id"), trunc(to_date(col("${date}")), "month").as("activity_month")).distinct(); val firstActivity = activity.groupBy("id").agg(min(col("activity_month")).as("cohort_month")); firstActivity.join(activity, "id").groupBy("cohort_month", "activity_month").agg(countDistinct(col("id")).as("entity_count")).orderBy("cohort_month", "activity_month") }`,
    '18': `${r}.select(col("id"), col("${fk}").as("entity_id"), col("${date}").as("event_date")).withColumn("running_event_count", count(lit(1)).over(Window.partitionBy("entity_id").orderBy("event_date", "id"))).orderBy("entity_id", "event_date", "id")`,
    '19': `{ val sequenced = ${r}.select(col("${fk}").as("id"), col("id").as("event_id"), col("${date}").as("event_date")).withColumn("previous_event_date", lag(col("event_date"), 1).over(Window.partitionBy("id").orderBy("event_date", "event_id"))); sequenced.filter(datediff(to_date(col("event_date")), to_date(col("previous_event_date"))) === 1).select("id", "event_id", "event_date").orderBy("id", "event_date", "event_id") }`,
    '20': `{ ${joinedCounts}; counts.withColumn("overall_rank", dense_rank().over(Window.orderBy(col("event_count").desc))).orderBy("overall_rank", "id") }`
  };
  return `import org.apache.spark.sql.DataFrame
import org.apache.spark.sql.functions._
import org.apache.spark.sql.expressions.Window

val result: DataFrame = {
  ${answers[number] || `${p}.limit(10)`}
}`;
}

function renderSparkReferenceAnswer(problem) {
  document.querySelector('#answerContent').textContent = sparkReferenceAnswer(problem);
  document.querySelector('#answerBox').classList.remove('open');
  document.querySelector('#answerButtonLabel').textContent = 'Show Spark Scala reference answer';
  document.querySelector('#answerBox .answer-content p').textContent = 'One Spark Scala DataFrame solution for the local fixture data. Equivalent DataFrame logic is also valid.';
}

function setSparkNotice(message, connected = false) {
  const notice = document.querySelector('#sparkLocalNotice');
  notice.classList.toggle('connected', connected);
  notice.querySelector('#sparkLocalMessage').innerHTML = message;
}

function isLocalQueryNest() {
  return ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
}

async function checkSparkRunner() {
  if (!isLocalQueryNest()) {
    sparkRunnerReady = false;
    setSparkNotice('<b>Spark Scala · local-only</b> Open QueryNest from <code>localhost</code>. A hosted site cannot access Spark on this computer.');
    return;
  }
  try {
    const response = await fetch(`${SPARK_RUNNER_URL}/health`);
    const health = await response.json();
    sparkRunnerReady = response.ok && health.sparkAvailable;
    setSparkNotice(sparkRunnerReady
      ? `<b>Spark Scala · local-only</b> Connected to <code>${health.sparkShell}</code> on this computer.`
      : '<b>Spark Scala · local-only</b> Runner is not available. Start <code>node local-spark-runner/server.js</code>.', sparkRunnerReady);
  } catch (_error) {
    sparkRunnerReady = false;
    setSparkNotice('<b>Spark Scala · local-only</b> Start <code>SPARK_SHELL=/path/to/spark-shell node local-spark-runner/server.js</code>.');
  }
}

function setEngine(engine) {
  if (engine !== querynestEngine) saveCurrentDraft();
  window.querynestSwitchingEngine = true;
  querynestEngine = engine;
  document.body.classList.toggle('spark-mode', engine === 'spark');
  document.querySelector('#enginePostgres').classList.toggle('active', engine === 'postgres');
  document.querySelector('#engineSpark').classList.toggle('active', engine === 'spark');
  document.querySelector('#sparkLocalNotice').classList.toggle('visible', engine === 'spark');
  setQuickReference(engine);
  document.querySelector('#runButton').innerHTML = engine === 'spark' ? 'Run Scala locally <span>▶</span>' : 'Run query <span>▶</span>';
  document.querySelector('#submitButton').innerHTML = engine === 'spark' ? 'Verify solution <span>✓</span>' : 'Submit solution <span>✓</span>';
  if (engine === 'spark') {
    loadProblem(current);
    document.querySelector('#resultStatus').textContent = 'Local Spark runner required';
    document.querySelector('#resultsContent').innerHTML = '<div class="empty-state"><div class="empty-icon">ϟ</div><div><strong>Spark Scala runs on this computer only.</strong><br>Start the local runner, then run your DataFrame logic.</div></div>';
    updateLines();
    checkSparkRunner();
  } else {
    loadProblem(current);
  }
  window.querynestSwitchingEngine = false;
}

function renderSparkResult(result) {
  const columns = result.columns || [];
  const rows = result.rows || [];
  document.querySelector('#resultBadge').textContent = rows.length;
  const table = rows.length
    ? `<table class="data-table"><thead><tr>${columns.map(column => `<th>${column}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${columns.map(column => `<td>${row[column] ?? 'NULL'}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    : '<div class="empty-state"><div class="empty-icon">✓</div><div>Spark ran successfully. No rows returned.</div></div>';
  const consoleOutput = result.consoleOutput ? `<details class="spark-console"><summary>Show Spark console output</summary><pre>${escapeSparkConsole(result.consoleOutput)}</pre></details>` : '';
  document.querySelector('#resultsContent').innerHTML = `${consoleOutput}${table}`;
}

async function runSparkScala() {
  const domain = currentDomain();
  if (!domain) return showToast('Open a Domain Lab question to use Spark Scala');
  if (!isLocalQueryNest()) return showToast('Open QueryNest locally to use Spark Scala');
  if (!sparkRunnerReady) {
    await checkSparkRunner();
    if (!sparkRunnerReady) return showToast('Start the local Spark runner first');
  }
  const code = document.querySelector('#queryEditor').value.trim();
  if (!code) return showToast('Write your Scala DataFrame logic first');
  const executableCode = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
  if (/val\s+result\s*:\s*DataFrame\s*=\s*\{[\s\S]*?\.show\s*\(/.test(executableCode)) {
    document.querySelector('#resultStatus').textContent = 'Update the result block';
    document.querySelector('#resultsContent').innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><div><strong><code>show()</code> cannot be the final result.</strong><br>Change the final line to a DataFrame such as <code>${domain.primary}.limit(10)</code>. For console-only debugging, delete the entire <code>val result</code> block and run just your <code>show()</code> statements.</div></div>`;
    return;
  }
  document.querySelector('#resultStatus').textContent = 'Running Spark locally…';
  document.querySelector('#runButton').disabled = true;
  document.body.classList.add('spark-running');
  const runStartedAt = Date.now();
  const runStatusTimer = window.setInterval(() => {
    const elapsedSeconds = Math.floor((Date.now() - runStartedAt) / 1000);
    if (elapsedSeconds >= 5) document.querySelector('#resultStatus').textContent = `Starting local Spark… ${elapsedSeconds}s (the first run can take ~30 seconds)`;
  }, 1000);
  try {
    const codeToRun = /val\s+result\s*:\s*DataFrame\s*=/.test(executableCode)
      ? code
      : `${code}\n\nval result: DataFrame = ${domain.primary}.limit(10)`;
    const response = await fetch(`${SPARK_RUNNER_URL}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain.key, code: codeToRun }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Local Spark execution failed.');
    renderSparkResult(result);
    document.querySelector('#resultStatus').innerHTML = '<span class="success">●</span> Executed locally with Spark Scala';
  } catch (error) {
    const message = String(error.message || error);
    if (message.includes('stopped by user')) {
      document.querySelector('#resultStatus').textContent = 'Spark run stopped';
      return;
    }
    sparkRunnerReady = false;
    setSparkNotice('<b>Spark Scala · local-only</b> Runner connection was lost. Start <code>SPARK_SHELL=/path/to/spark-shell node local-spark-runner/server.js</code>.');
    document.querySelector('#resultBadge').textContent = '';
    document.querySelector('#resultStatus').textContent = 'Spark Scala error';
    const guidance = message === 'Failed to fetch' ? 'The local runner is no longer running. Start it again, then retry.' : 'For previews, call <code>dataframe.show()</code> before the final DataFrame expression.';
    document.querySelector('#resultsContent').innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><div><strong>Local Spark error</strong><br>${message}<br><br>${guidance}</div></div>`;
  } finally {
    window.clearInterval(runStatusTimer);
    document.querySelector('#runButton').disabled = false;
    document.body.classList.remove('spark-running');
  }
}

function sameSparkResult(candidate, expected) {
  const columns = result => (result.columns || []).map(value => value.toLowerCase());
  const normalize = result => (result.rows || []).map(row => columns(result).map(column => String(row[column] ?? row[Object.keys(row).find(key => key.toLowerCase() === column)] ?? 'NULL'))).sort();
  return JSON.stringify(columns(candidate)) === JSON.stringify(columns(expected)) && JSON.stringify(normalize(candidate)) === JSON.stringify(normalize(expected));
}

async function verifySparkSolution() {
  const problem = problems[current];
  const domain = currentDomain();
  if (!domain || problem.id.startsWith('SP')) return showToast('Spark interview-track answer keys are being authored next.');
  if (!sparkRunnerReady) { await checkSparkRunner(); if (!sparkRunnerReady) return showToast('Start the local Spark runner first'); }
  const candidateCode = document.querySelector('#queryEditor').value.trim();
  if (!candidateCode) return showToast('Write your Spark solution first');
  document.querySelector('#submitButton').disabled = true;
  document.body.classList.add('spark-running');
  document.querySelector('#resultStatus').textContent = 'Verifying with local Spark…';
  try {
    const request = async code => {
      const response = await fetch(`${SPARK_RUNNER_URL}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain.key, code }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Spark execution failed.');
      return result;
    };
    const candidate = await request(candidateCode);
    const expected = await request(sparkReferenceAnswer(problem));
    renderSparkResult(candidate);
    const accepted = sameSparkResult(candidate, expected);
    document.querySelector('#resultStatus').innerHTML = accepted ? '<span class="success">●</span> Accepted by local Spark verifier' : 'Not accepted yet';
    document.querySelector('#resultsContent').insertAdjacentHTML('afterbegin', accepted
      ? '<div class="validation-card pass"><b>✓ Correct answer</b>Your Spark result matches the hidden local reference result.</div>'
      : '<div class="validation-card fail"><b>Output does not match the expected result</b>Check output columns, values, and ordering, then try again.</div>');
  } catch (error) {
    document.querySelector('#resultStatus').textContent = 'Spark verification error';
    document.querySelector('#resultsContent').innerHTML = `<div class="empty-state"><div class="empty-icon">!</div><div><strong>Verification failed</strong><br>${String(error.message || error)}</div></div>`;
  } finally {
    document.querySelector('#submitButton').disabled = false;
    document.body.classList.remove('spark-running');
  }
}

async function stopSparkRun() {
  const button = document.querySelector('#cancelSparkButton');
  button.disabled = true;
  button.textContent = 'Stopping…';
  try {
    await fetch(`${SPARK_RUNNER_URL}/cancel`, { method: 'POST' });
    document.querySelector('#resultStatus').textContent = 'Spark run stopped';
  } finally {
    button.disabled = false;
    button.textContent = '■ Stop Spark run';
  }
}

const loadProblemBeforeSpark = loadProblem;
loadProblem = function loadProblemWithEngine(index) {
  loadProblemBeforeSpark(index);
  if (querynestEngine === 'spark') {
    const savedSparkDraft = sqlDrafts[`spark:${problems[index].id}`];
    document.querySelector('#queryEditor').value = savedSparkDraft || sparkStarter(problems[index]);
    document.querySelector('.tags').innerHTML = '<span>SPARK SCALA</span><span>LOCAL ONLY</span>';
    const sparkDetails = sparkChallengeDetails(problems[index]);
    if (sparkDetails) {
      document.querySelector('.tags').innerHTML = `<span>SPARK SCALA</span><span>${sparkDetails.tag}</span><span>LOCAL ONLY</span>`;
      document.querySelector('#description').innerHTML = sparkDetails.description;
    }
    renderSparkReferenceAnswer(problems[index]);
    updateLines();
  }
};

document.querySelector('#enginePostgres').onclick = () => setEngine('postgres');
document.querySelector('#engineSpark').onclick = () => setEngine('spark');
document.querySelector('#runButton').onclick = () => querynestEngine === 'spark' ? runSparkScala() : executePracticeQuery();
document.querySelector('#submitButton').onclick = () => querynestEngine === 'spark' ? verifySparkSolution() : runQuery();
document.querySelector('#cancelSparkButton').onclick = stopSparkRun;
document.querySelector('#queryEditor').addEventListener('keydown', event => {
  if (querynestEngine === 'spark' && (event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault();
    event.stopImmediatePropagation();
    runSparkScala();
  }
}, true);
