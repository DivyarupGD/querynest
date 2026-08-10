// Show one canonical answer while still allowing equivalent PostgreSQL solutions.
function renderReferenceAnswer(problem) {
  const answerBox = document.querySelector('#answerBox');
  document.querySelector('#answerContent').textContent = problem.expectedQuery || problem.query;
  answerBox.classList.remove('open');
  document.querySelector('#answerButtonLabel').textContent = 'Show reference answer';
}

const loadProblemWithAnswer = loadProblem;
loadProblem = function loadProblemAndAnswer(index) {
  loadProblemWithAnswer(index);
  renderReferenceAnswer(problems[index]);
};

document.querySelector('#answerButton').onclick = () => {
  const answerBox = document.querySelector('#answerBox');
  const isOpen = answerBox.classList.toggle('open');
  document.querySelector('#answerButtonLabel').textContent = isOpen ? 'Hide reference answer' : 'Show reference answer';
};
