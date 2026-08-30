#!/usr/bin/env node
/*
 * Local-only Spark Scala runner for QueryNest.
 * It listens exclusively on 127.0.0.1 and never sends code or data to a server.
 */
const http = require('node:http');
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const PORT = Number(process.env.QUERYNEST_SPARK_PORT || 8788);
const SPARK_SHELL = process.env.SPARK_SHELL || findSparkShell();
const MAX_RUNTIME_MS = 45_000;
let running = false;
let sparkShellProcess;
let sparkShellBoot;
let rejectSparkShellBoot;
let activeJob;
let jobSequence = 0;

function findSparkShell() {
  const found = spawnSync('/bin/sh', ['-lc', 'command -v spark-shell'], { encoding: 'utf8' });
  return found.status === 0 ? found.stdout.trim() : '';
}

const domainConfig = {
  banking: { tables: { customers: ['id', 'full_name', 'city'], accounts: ['id', 'customer_id', 'account_type', 'opened_on'], transactions: ['id', 'account_id', 'amount', 'transaction_at'] }, primary: 'accounts', related: 'transactions', foreignKey: 'account_id', date: 'transaction_at' },
  healthcare: { tables: { patients: ['id', 'name', 'birth_date'], providers: ['id', 'name', 'specialty'], appointments: ['id', 'patient_id', 'provider_id', 'scheduled_at'], claims: ['id', 'appointment_id', 'amount', 'status'] }, primary: 'patients', related: 'appointments', foreignKey: 'patient_id', date: 'scheduled_at' },
  retail: { tables: { customers: ['id', 'name', 'segment'], products: ['id', 'name', 'category', 'price'], orders: ['id', 'customer_id', 'ordered_at'], order_items: ['order_id', 'product_id', 'quantity'] }, primary: 'customers', related: 'orders', foreignKey: 'customer_id', date: 'ordered_at' },
  workforce: { tables: { departments: ['id', 'name'], employees: ['id', 'department_id', 'name', 'hired_on'], payroll: ['id', 'employee_id', 'salary', 'paid_on'], reviews: ['id', 'employee_id', 'score', 'reviewed_on'] }, primary: 'employees', related: 'payroll', foreignKey: 'employee_id', date: 'paid_on' },
  travel: { tables: { travelers: ['id', 'name', 'country'], flights: ['id', 'route', 'departed_at'], bookings: ['id', 'traveler_id', 'flight_id', 'booked_at'], payments: ['id', 'booking_id', 'amount', 'paid_at'] }, primary: 'travelers', related: 'bookings', foreignKey: 'traveler_id', date: 'booked_at' },
  streaming: { tables: { users: ['id', 'name', 'country'], subscriptions: ['id', 'user_id', 'plan', 'started_at'], content: ['id', 'title', 'genre'], watch_history: ['id', 'user_id', 'content_id', 'watched_at', 'minutes'] }, primary: 'users', related: 'watch_history', foreignKey: 'user_id', date: 'watched_at' },
  logistics: { tables: { warehouses: ['id', 'city', 'capacity'], carriers: ['id', 'name', 'region'], shipments: ['id', 'warehouse_id', 'carrier_id', 'shipped_at'], delivery_events: ['id', 'shipment_id', 'event_type', 'occurred_at'] }, primary: 'shipments', related: 'delivery_events', foreignKey: 'shipment_id', date: 'occurred_at' },
  education: { tables: { students: ['id', 'name', 'cohort'], courses: ['id', 'title', 'subject'], enrollments: ['id', 'student_id', 'course_id', 'enrolled_at'], assessments: ['id', 'enrollment_id', 'score', 'submitted_at'] }, primary: 'students', related: 'enrollments', foreignKey: 'student_id', date: 'enrolled_at' },
  hospitality: { tables: { guests: ['id', 'name', 'country'], rooms: ['id', 'room_type', 'nightly_rate'], stays: ['id', 'guest_id', 'room_id', 'checked_in_at'], charges: ['id', 'stay_id', 'amount', 'charged_at'] }, primary: 'guests', related: 'stays', foreignKey: 'guest_id', date: 'checked_in_at' }
};

function dateFor(index) {
  const day = String((index % 28) + 1).padStart(2, '0');
  const month = String(((Math.floor(index / 28)) % 12) + 1).padStart(2, '0');
  return `2025-${month}-${day}`;
}

function valueFor(column, index, config) {
  if (column === 'id') return index;
  if (column === config.foreignKey) return ((index - 1) % 24) + 1;
  if (column.endsWith('_id')) return ((index - 1) % 12) + 1;
  if (/(date|_at|_on)$/.test(column)) return dateFor(index);
  if (/(amount|salary|price|rate|capacity|minutes|score|quantity)$/.test(column)) return index % 7 === 0 ? 0 : index * 10;
  if (column === 'status') return ['paid', 'pending', 'denied'][index % 3];
  if (column === 'event_type') return ['picked', 'in_transit', 'delivered'][index % 3];
  if (column === 'account_type') return ['Savings', 'Current', 'Business'][index % 3];
  if (column === 'segment') return ['Gold', 'Silver', 'Bronze'][index % 3];
  if (column === 'plan') return ['Basic', 'Premium', 'Family'][index % 3];
  if (column === 'country') return ['India', 'Singapore', 'Japan'][index % 3];
  if (column === 'city') return ['Mumbai', 'Delhi', 'Pune'][index % 3];
  if (column === 'category' || column === 'genre' || column === 'subject' || column === 'specialty' || column === 'region') return ['Alpha', 'Beta', 'Gamma'][index % 3];
  return `${column.replaceAll('_', ' ')} ${index}`;
}

function makeFixtures(domainKey) {
  const config = domainConfig[domainKey];
  if (!config) throw new Error('Unknown domain');
  const output = {};
  for (const [table, columns] of Object.entries(config.tables)) {
    const isPrimary = table === config.primary;
    const isRelated = table === config.related;
    const count = isRelated ? 132 : isPrimary ? 25 : 36;
    output[table] = Array.from({ length: count }, (_, offset) => {
      const index = offset + 1;
      return Object.fromEntries(columns.map(column => [column, valueFor(column, index, config)]));
    });
    if (isPrimary) output[table].push(Object.fromEntries(columns.map(column => [column, valueFor(column, 999, config)])));
  }
  return { config, tables: output };
}

async function writeFixtures(root, domainKey) {
  const fixture = makeFixtures(domainKey);
  await Promise.all(Object.entries(fixture.tables).map(([table, rows]) => fs.writeFile(path.join(root, `${table}.json`), rows.map(row => JSON.stringify(row)).join('\n'))));
  return fixture;
}

function scalaShellJob(root, fixture, code, jobId) {
  const tableLoads = Object.keys(fixture.tables).map(table => `val ${table} = spark.read.json("${path.join(root, `${table}.json`).replaceAll('\\', '\\\\')}")\n${table}.createOrReplaceTempView("${table}")`).join('\n\n');
  const interviewDataRoot = path.join(__dirname, 'datasets').replaceAll('\\', '\\\\');
  return `object QueryNestJob${jobId} { def run(): Unit = {
import org.apache.spark.sql.DataFrame
import org.apache.spark.sql.functions._
import org.apache.spark.sql.expressions.Window
import spark.implicits._
val queryNestDataRoot = "${interviewDataRoot}"

${tableLoads}

${code}

println("__QN_COLUMNS__${jobId}:" + result.columns.mkString("\\t"))
result.limit(200).toJSON.collect().foreach(row => println("__QN_ROW__${jobId}:" + row))
println("__QN_DONE__${jobId}")
} }
QueryNestJob${jobId}.run()
`.split('\n').filter(line => line.trim()).join('\n') + '\n';
}

function finishActiveJob(error) {
  if (!activeJob) return;
  const job = activeJob;
  activeJob = undefined;
  clearTimeout(job.timer);
  if (error) return job.reject(error);
  const marker = String(job.id);
  const columns = (job.output.match(new RegExp(`^\\s*(?:scala>\\s*)?__QN_COLUMNS__${marker}:(.*)$`, 'm'))?.[1] || '').split('\t').filter(Boolean);
  const rows = [...job.output.matchAll(new RegExp(`^\\s*(?:scala>\\s*)?__QN_ROW__${marker}:(\\{.*\\})$`, 'gm'))].flatMap(match => {
    try { return [JSON.parse(match[1])]; } catch { return []; }
  });
  const consoleOutput = job.output.split('\n').filter(line => !/^\s*(?:scala>\s*)?__QN_(?:COLUMNS|ROW|DONE)__/.test(line)).join('\n').trim().slice(-6000);
  job.resolve({ columns, rows, consoleOutput });
}

function ensureSparkShell() {
  if (sparkShellProcess && !sparkShellProcess.killed) return Promise.resolve();
  if (sparkShellBoot) return sparkShellBoot;
  sparkShellBoot = new Promise((resolve, reject) => {
    rejectSparkShellBoot = reject;
    const child = sparkShellProcess = spawn(SPARK_SHELL, ['--master', 'local[2]', '--conf', 'spark.ui.enabled=false'], { env: { ...process.env, SPARK_LOCAL_IP: '127.0.0.1' } });
    let bootOutput = '';
    const bootTimer = setTimeout(() => reject(new Error('Spark did not start within 45 seconds.')), MAX_RUNTIME_MS);
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      bootOutput += text;
      if (activeJob) {
        activeJob.output += text;
        if (new RegExp(`^\\s*(?:scala>\\s*)?__QN_DONE__${activeJob.id}\\s*$`, 'm').test(activeJob.output)) finishActiveJob();
      }
      if (/Spark session available|scala>/.test(bootOutput)) {
        clearTimeout(bootTimer);
        sparkShellBoot = undefined;
        rejectSparkShellBoot = undefined;
        resolve();
      }
    });
    child.stderr.on('data', chunk => { if (activeJob) activeJob.output += chunk.toString(); });
    child.on('error', error => { clearTimeout(bootTimer); sparkShellProcess = undefined; sparkShellBoot = undefined; rejectSparkShellBoot = undefined; finishActiveJob(error); reject(error); });
    child.on('close', () => { const error = new Error('The local Spark session stopped. Restart the runner.'); sparkShellProcess = undefined; sparkShellBoot = undefined; rejectSparkShellBoot?.(error); rejectSparkShellBoot = undefined; finishActiveJob(error); });
  });
  return sparkShellBoot;
}

async function runSpark(root, fixture, code) {
  await ensureSparkShell();
  const id = ++jobSequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finishActiveJob(new Error('Spark execution timed out after 45 seconds.')), MAX_RUNTIME_MS);
    activeJob = { id, output: '', resolve, reject, timer };
    sparkShellProcess.stdin.write(scalaShellJob(root, fixture, code, id));
  });
}

function cancelSparkRun() {
  if (!activeJob && !sparkShellBoot) return false;
  finishActiveJob(new Error('Spark run stopped by user.'));
  rejectSparkShellBoot?.(new Error('Spark run stopped by user.'));
  if (sparkShellProcess && !sparkShellProcess.killed) sparkShellProcess.kill('SIGKILL');
  return true;
}

function respond(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(body));
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'OPTIONS') return respond(response, 204, {});
  if (request.method === 'GET' && request.url === '/health') return respond(response, 200, { localOnly: true, sparkAvailable: Boolean(SPARK_SHELL), sparkShell: path.basename(SPARK_SHELL || '') });
  if (request.method === 'POST' && request.url === '/cancel') return respond(response, 200, { cancelled: cancelSparkRun() });
  if (request.method !== 'POST' || request.url !== '/run') return respond(response, 404, { error: 'Not found' });
  if (!SPARK_SHELL) return respond(response, 503, { error: 'Spark was not found. Start this runner with SPARK_SHELL=/path/to/spark-shell.' });
  if (running) return respond(response, 429, { error: 'A local Spark job is already running.' });
  let body = '';
  request.on('data', chunk => { body += chunk; });
  request.on('end', async () => {
    let payload;
    try { payload = JSON.parse(body); } catch { return respond(response, 400, { error: 'Invalid JSON request.' }); }
    if (!domainConfig[payload.domain] || typeof payload.code !== 'string' || payload.code.length > 50_000) return respond(response, 400, { error: 'Invalid domain or Scala code.' });
    running = true;
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'querynest-spark-'));
    try {
      const fixture = await writeFixtures(root, payload.domain);
      respond(response, 200, await runSpark(root, fixture, payload.code));
    } catch (error) {
      respond(response, 422, { error: String(error.message || error).slice(-4000) });
    } finally {
      running = false;
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

server.listen(PORT, '127.0.0.1', () => console.log(`QueryNest Spark runner listening locally at http://127.0.0.1:${PORT}`));
