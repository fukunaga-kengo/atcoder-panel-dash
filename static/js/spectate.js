// AtCoder Panel Dash - 観戦画面（大画面表示用）

let currentState = null;
let pollingInterval = null;
let timerInterval = null;

const VIEWS = ['waitingView', 'gameView', 'resultView'];
const HEADER_OFFSET = 300;
const MARGIN = 100;
const MIN_CELL_SIZE = 80;
const MAX_CELL_SIZE = 150;

document.addEventListener('DOMContentLoaded', startPolling);

async function updateView() {
    currentState = await fetchGameState();

    if (!currentState || currentState.status === 'setup') {
        showWaitingView();
        return;
    }

    if (currentState.status === 'running') {
        showGameView();
    } else if (currentState.status === 'ended') {
        showResultView();
    } else {
        showWaitingView();
    }
}

function showWaitingView() {
    showView('waitingView', VIEWS);
    stopTimerUpdate();
}

function showGameView() {
    showView('gameView', VIEWS);
    renderSpectateBoard();
    renderScoreboard(document.getElementById('scoreboard'), currentState);
    startTimerUpdate();
}

function showResultView() {
    showView('resultView', VIEWS);
    renderScoreboard(document.getElementById('finalScoreboard'), currentState);
    displayWinner(document.getElementById('winnerDisplay'), currentState);
    stopTimerUpdate();
}

function calculateCellSize(boardSize) {
    const availableHeight = window.innerHeight - HEADER_OFFSET;
    const availableWidth = window.innerWidth - MARGIN;
    const maxCellSize = Math.min(
        Math.floor(availableHeight / boardSize) - 10,
        Math.floor(availableWidth / boardSize) - 10,
        MAX_CELL_SIZE
    );
    return Math.max(MIN_CELL_SIZE, maxCellSize);
}

function renderSpectateBoard() {
    if (!currentState) return;

    const cellSize = calculateCellSize(currentState.board_size);
    renderBoard(document.getElementById('board'), currentState, {
        showLinks: false,
        cellSize: cellSize
    });
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

window.addEventListener('resize', () => {
    if (currentState && currentState.status === 'running') {
        renderSpectateBoard();
    }
});
