const TOTAL_CHALLENGES = 180;
const progressNames = {
  '001': 'Customers Who Never Order',
  '002': 'Second Highest Salary',
  '003': 'Rising Temperature',
  '004': 'Department Top Three Salaries',
  '005': 'Duplicate Emails'
};
const progressDomains = { BA: 'Banking', HE: 'Healthcare', RE: 'Retail', WO: 'Workforce', TR: 'Travel', ST: 'Streaming', LO: 'Logistics', ED: 'Education', HO: 'Hospitality' };
let progressRequestId = 0;

function progressLabel(code) {
  return progressNames[code] || `${progressDomains[code.slice(0, 2)] || 'Domain'} challenge ${code.slice(-2)}`;
}
function hideProgress() {
  progressRequestId += 1;
  document.body.classList.remove('progress-mode');
  document.querySelector('#progressView').hidden = true;
}
function progressHeader() {
  return '<div class="progress-head"><div><div class="eyebrow">PERSONAL DASHBOARD</div><h1>Your progress</h1><p>Track the practice that is building your interview muscle.</p></div><button class="progress-back" id="progressBack">← Domain labs</button></div>';
}
function bindProgressBack() {
  document.querySelector('#progressBack').onclick = () => {
    hideProgress();
    showLabs();
  };
}
async function openProgress() {
  const requestId = ++progressRequestId;
  document.body.classList.remove('domains-mode', 'practice-mode');
  document.body.classList.add('progress-mode');
  document.querySelector('#sidebar').classList.remove('open');
  document.querySelector('.content-grid').hidden = true;
  document.querySelector('#domainView').hidden = true;
  const view = document.querySelector('#progressView');
  view.hidden = false;
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  document.querySelector('#progressLink').classList.add('active');
  view.innerHTML = `${progressHeader()}<div class="progress-empty">Loading your saved practice…</div>`;
  bindProgressBack();

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (requestId !== progressRequestId || !document.body.classList.contains('progress-mode')) return;
  if (!session) {
    view.querySelector('.progress-empty').textContent = 'Sign in to save and view your progress.';
    return;
  }
  const { data: rows, error } = await supabaseClient
    .from('user_progress')
    .select('problem_code,status,attempts,updated_at')
    .order('updated_at', { ascending: false });
  if (requestId !== progressRequestId || !document.body.classList.contains('progress-mode')) return;
  if (error) {
    view.querySelector('.progress-empty').textContent = `Progress could not be loaded: ${error.message}. Ensure schema.sql was run before progress-migration.sql.`;
    return;
  }

  const attempted = rows.length;
  const solved = rows.filter(row => row.status === 'solved').length;
  const completion = Math.round((solved / TOTAL_CHALLENGES) * 100);
  const domainProgress = Object.entries(progressDomains).map(([code, name]) => {
    const domainRows = rows.filter(row => row.problem_code.startsWith(code));
    const domainSolved = domainRows.filter(row => row.status === 'solved').length;
    const percent = Math.round((domainSolved / 20) * 100);
    return `<div class="domain-progress-card"><b>${name}</b><p><span>${domainSolved} / 20 solved</span><span>${percent}%</span></p><div class="domain-progress-track"><i style="width:${percent}%"></i></div></div>`;
  }).join('');
  const activity = rows.length
    ? `<table class="progress-table"><thead><tr><th>CHALLENGE</th><th>STATUS</th><th>ATTEMPTS</th><th>LAST ACTIVITY</th></tr></thead><tbody>${rows.slice(0, 12).map(row => `<tr><td>${progressLabel(row.problem_code)}</td><td><span class="status-pill ${row.status}">${row.status}</span></td><td>${row.attempts}</td><td>${new Date(row.updated_at).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`
    : '<div class="progress-empty">No practice saved yet. Solve or attempt a question to start your history.</div>';
  view.innerHTML = `${progressHeader()}<div class="progress-cards"><div class="progress-card"><span>Solved</span><b>${solved}</b><small>of ${TOTAL_CHALLENGES} challenges</small></div><div class="progress-card"><span>Attempted</span><b>${attempted}</b><small>distinct challenges</small></div><div class="progress-card"><span>Completion</span><b>${completion}%</b><small>toward your full library</small></div></div><section class="progress-panel"><h2>Progress by domain</h2><div class="domain-progress-grid">${domainProgress}</div></section><div class="progress-panel"><h2>Recent activity</h2>${activity}</div>`;
  bindProgressBack();
}

document.querySelector('#practiceLink').onclick = event => {
  event.preventDefault();
  hideProgress();
  showPractice();
};
document.querySelector('#domainsLink').onclick = event => {
  event.preventDefault();
  hideProgress();
  showLabs();
};
document.querySelector('#progressLink').onclick = event => {
  event.preventDefault();
  openProgress();
};
