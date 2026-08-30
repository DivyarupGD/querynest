#!/usr/bin/env node
/* Creates local-only source files for Spark interview exercises. */
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.join(__dirname, 'datasets');
const csv = (columns, rows) => [columns.join(','), ...rows.map(row => columns.map(column => JSON.stringify(row[column] ?? '')).join(','))].join('\n');
const date = index => `2025-${String((Math.floor(index / 28) % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`;
const timestamp = index => `${date(index)} ${String(index % 24).padStart(2, '0')}:${String((index * 7) % 60).padStart(2, '0')}:${String((index * 13) % 60).padStart(2, '0')}`;

async function write(name, columns, rows) {
  const folder = path.join(root, name);
  await fs.mkdir(folder, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(folder, `${name}.csv`), csv(columns, rows)),
    fs.writeFile(path.join(folder, `${name}.json`), rows.map(JSON.stringify).join('\n'))
  ]);
}

async function main() {
  const customers = Array.from({ length: 5000 }, (_, offset) => ({ id: offset + 1, name: `Customer ${offset + 1}`, segment: ['Gold', 'Silver', 'Bronze'][offset % 3], city: ['Mumbai', 'Delhi', 'Pune', 'Bengaluru'][offset % 4] }));
  const orders = Array.from({ length: 50000 }, (_, offset) => ({ id: offset + 1, customer_id: (offset % 5000) + 1, ordered_at: timestamp(offset), amount: (offset % 13 === 0 ? 0 : (offset % 2000) + 10), status: ['paid', 'pending', 'cancelled'][offset % 3] }));
  const events = Array.from({ length: 100000 }, (_, offset) => ({ id: offset + 1, user_id: (offset % 5000) + 1, event_type: ['view', 'click', 'purchase', 'refund'][offset % 4], event_at: timestamp(offset), event_timezone: ['Asia/Kolkata', 'UTC', 'America/New_York'][offset % 3], payload: JSON.stringify({ device: ['web', 'mobile'][offset % 2], campaign: `campaign_${offset % 12}` }) }));
  await Promise.all([
    write('customers', ['id', 'name', 'segment', 'city'], customers),
    write('orders', ['id', 'customer_id', 'ordered_at', 'amount', 'status'], orders),
    write('events', ['id', 'user_id', 'event_type', 'event_at', 'event_timezone', 'payload'], events)
  ]);
  console.log(`Created local Spark datasets in ${root}`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
