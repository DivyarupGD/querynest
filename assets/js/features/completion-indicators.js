// Mark solved questions in the sidebar using the signed-in user's saved progress.
let solvedProblemCodes = new Set();

function renderCompletionIndicators() {
  document.querySelectorAll('#problemList .problem-item').forEach(button => {
    const problem = problems[Number(button.dataset.i)];
    const isSolved = Boolean(problem && solvedProblemCodes.has(problem.id));
    button.classList.toggle('completed', isSolved);
    button.setAttribute('aria-label', isSolved ? `${problem.title} — solved` : problem.title);
  });
}

const renderProblemListWithCompletion = renderList;
renderList = function renderListWithCompletion() {
  renderProblemListWithCompletion();
  renderCompletionIndicators();
};

async function loadSolvedProblems() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    solvedProblemCodes = new Set();
    renderCompletionIndicators();
    return;
  }
  const { data, error } = await supabaseClient
    .from('user_progress')
    .select('problem_code,status')
    .eq('status', 'solved');
  if (error) return;
  solvedProblemCodes = new Set(data.map(row => row.problem_code));
  renderCompletionIndicators();
}

const submitSolutionWithCompletion = document.querySelector('#submitButton').onclick;
document.querySelector('#submitButton').onclick = async event => {
  await submitSolutionWithCompletion(event);
  await loadSolvedProblems();
};
supabaseClient.auth.onAuthStateChange(() => loadSolvedProblems());
loadSolvedProblems();
