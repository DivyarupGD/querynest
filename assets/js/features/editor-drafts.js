// Preserve SQL per question locally immediately, then mirror it to Supabase when signed in.
const DRAFT_STORAGE_KEY = 'querynest.sql-drafts.v1';
let sqlDrafts = {};
let draftSyncTimer;

try {
  sqlDrafts = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || '{}');
} catch (_error) {
  sqlDrafts = {};
}

function persistDrafts() {
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(sqlDrafts));
}

function saveCurrentDraft() {
  const problem = problems[current];
  if (!problem) return;
  sqlDrafts[problem.id] = document.querySelector('#queryEditor').value;
  persistDrafts();
  scheduleDraftSync(problem.id);
}

function restoreDraft(problem) {
  const editor = document.querySelector('#queryEditor');
  const savedDraft = Object.prototype.hasOwnProperty.call(sqlDrafts, problem.id)
    ? sqlDrafts[problem.id]
    : problem.query;
  const cleanedDraft = savedDraft.replace(/^-- .*\n-- Write your PostgreSQL query here\n(?=SELECT \* FROM )/, '');
  if (cleanedDraft !== savedDraft) {
    sqlDrafts[problem.id] = cleanedDraft;
    persistDrafts();
  }
  editor.value = cleanedDraft;
  updateLines();
}

function scheduleDraftSync(problemCode) {
  window.clearTimeout(draftSyncTimer);
  draftSyncTimer = window.setTimeout(() => syncDraft(problemCode), 700);
}

async function syncDraft(problemCode) {
  const query = sqlDrafts[problemCode];
  if (typeof query !== 'string') return;
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const { data: existing, error: readError } = await supabaseClient
    .from('saved_queries')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('problem_code', problemCode)
    .limit(1)
    .maybeSingle();
  if (readError) return;

  const payload = { user_id: session.user.id, problem_code: problemCode, query, name: 'Draft', updated_at: new Date().toISOString() };
  if (existing) {
    await supabaseClient.from('saved_queries').update(payload).eq('id', existing.id);
  } else {
    await supabaseClient.from('saved_queries').insert(payload);
  }
}

async function restoreCloudDrafts() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;
  const [draftResult, progressResult] = await Promise.all([
    supabaseClient.from('saved_queries').select('problem_code,query,updated_at').order('updated_at', { ascending: false }),
    supabaseClient.from('user_progress').select('problem_code,last_query,updated_at').not('last_query', 'is', null)
  ]);

  if (progressResult.data) {
    progressResult.data.forEach(row => {
      if (!Object.prototype.hasOwnProperty.call(sqlDrafts, row.problem_code) && row.last_query) {
        sqlDrafts[row.problem_code] = row.last_query;
      }
    });
  }
  if (draftResult.data) {
    draftResult.data.forEach(row => {
      if (row.query) sqlDrafts[row.problem_code] = row.query;
    });
  }
  persistDrafts();
  const problem = problems[current];
  if (problem) restoreDraft(problem);
}

function toggleSqlLineComments(editor) {
  const source = editor.value;
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;
  const firstLineStart = source.lastIndexOf('\n', Math.max(0, selectionStart - 1)) + 1;
  const finalLineEnd = source.indexOf('\n', selectionEnd);
  const lastLineEnd = finalLineEnd === -1 ? source.length : finalLineEnd;
  const selectedLines = source.slice(firstLineStart, lastLineEnd);
  const lines = selectedLines.split('\n');
  const nonBlankLines = lines.filter(line => line.trim());
  const shouldUncomment = nonBlankLines.length > 0 && nonBlankLines.every(line => /^\s*--(?:\s|$)/.test(line));
  const nextLines = lines.map(line => {
    if (!line.trim()) return line;
    return shouldUncomment ? line.replace(/^(\s*)-- ?/, '$1') : line.replace(/^(\s*)/, '$1-- ');
  });
  const replacement = nextLines.join('\n');
  editor.setRangeText(replacement, firstLineStart, lastLineEnd, 'select');
  editor.selectionStart = firstLineStart;
  editor.selectionEnd = firstLineStart + replacement.length;
  editor.dispatchEvent(new Event('input', { bubbles: true }));
}

const baseLoadProblemWithDrafts = loadProblem;
loadProblem = function loadProblemWithDrafts(index) {
  saveCurrentDraft();
  baseLoadProblemWithDrafts(index);
  restoreDraft(problems[index]);
};

document.querySelector('#queryEditor').addEventListener('input', saveCurrentDraft);
document.querySelector('#queryEditor').addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && (event.key === '/' || event.code === 'Slash')) {
    event.preventDefault();
    toggleSqlLineComments(event.currentTarget);
  }
});
document.querySelector('#submitButton').addEventListener('click', saveCurrentDraft);
supabaseClient.auth.onAuthStateChange((_event, session) => {
  if (session) restoreCloudDrafts();
});
