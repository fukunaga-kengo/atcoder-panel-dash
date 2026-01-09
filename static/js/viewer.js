// AtCoder Panel Dash - 参加者画面

let currentState = null;
let pollingInterval = null;
let timerInterval = null;

const VIEWS = ['waitingView', 'gameView', 'resultView'];

document.addEventListener('DOMContentLoaded', startPolling);

async function updateView() {
    currentState = await fetchGameState();

    if (!currentState || currentState.status === 'setup') {
        showWaitingView();
        return;
    }

    updateStatusBadge(currentState.status);

    if (currentState.status === 'running') {
        showGameView();
    } else if (currentState.status === 'ended') {
        showResultView();
    } else {
        showWaitingView();
    }
}

function updateStatusBadge(status) {
    const badge = document.getElementById('gameStatus');
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    badge.className = `status ${status}`;
}

function showWaitingView() {
    showView('waitingView', VIEWS);
    stopTimerUpdate();
}

function showGameView() {
    showView('gameView', VIEWS);
    renderBoard(document.getElementById('board'), currentState, { showLinks: true });
    renderScoreboard(document.getElementById('scoreboard'), currentState);
    startTimerUpdate();
}

function showResultView() {
    showView('resultView', VIEWS);
    renderBoard(document.getElementById('finalBoard'), currentState, { showLinks: false });
    renderScoreboard(document.getElementById('finalScoreboard'), currentState);
    displayWinner(document.getElementById('winnerDisplay'), currentState);
    stopTimerUpdate();
}

function startPolling() {
    updateView();
    pollingInterval = setInterval(updateView, POLLING_INTERVAL);
}

function startTimerUpdate() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        updateTimer(document.getElementById('timer'), currentState);
    }, 1000);
}

function stopTimerUpdate() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
