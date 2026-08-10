// Keep predictable undo/redo history for each question's SQL editor.
const sqlEditor = document.querySelector('#queryEditor');
let undoHistory = [];
let redoHistory = [];
let editorSnapshot = captureEditorSnapshot();
let applyingHistory = false;

function captureEditorSnapshot() {
  return {
    value: sqlEditor.value,
    start: sqlEditor.selectionStart,
    end: sqlEditor.selectionEnd
  };
}

function resetEditorHistory() {
  undoHistory = [];
  redoHistory = [];
  editorSnapshot = captureEditorSnapshot();
}

function applyEditorSnapshot(snapshot) {
  applyingHistory = true;
  sqlEditor.value = snapshot.value;
  sqlEditor.setSelectionRange(snapshot.start, snapshot.end);
  updateLines();
  editorSnapshot = captureEditorSnapshot();
  sqlEditor.dispatchEvent(new Event('input', { bubbles: true }));
  applyingHistory = false;
}

sqlEditor.addEventListener('input', () => {
  const nextSnapshot = captureEditorSnapshot();
  if (applyingHistory) return;
  if (nextSnapshot.value !== editorSnapshot.value) {
    undoHistory.push(editorSnapshot);
    if (undoHistory.length > 150) undoHistory.shift();
    redoHistory = [];
  }
  editorSnapshot = nextSnapshot;
});

sqlEditor.addEventListener('keydown', event => {
  const modifierHeld = event.metaKey || event.ctrlKey;
  if (!modifierHeld || event.key.toLowerCase() !== 'z') {
    if (modifierHeld && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
      if (!redoHistory.length) return;
      event.preventDefault();
      undoHistory.push(editorSnapshot);
      applyEditorSnapshot(redoHistory.pop());
    }
    return;
  }
  event.preventDefault();
  if (event.shiftKey) {
    if (!redoHistory.length) return;
    undoHistory.push(editorSnapshot);
    applyEditorSnapshot(redoHistory.pop());
    return;
  }
  if (!undoHistory.length) return;
  redoHistory.push(editorSnapshot);
  applyEditorSnapshot(undoHistory.pop());
});

const loadProblemWithHistory = loadProblem;
loadProblem = function loadProblemAndResetHistory(index) {
  loadProblemWithHistory(index);
  resetEditorHistory();
};
