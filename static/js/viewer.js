// AtCoder Panel Dash - 参加者画面

let currentState = null;
let pollingInterval = null;
let timerInterval = null;

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    startPolling();
});

// ゲーム状態取得・画面更新
async function updateView() {
    currentState = await fetchGameState();

    if (!currentState) {
        showWaitingView();
        return;
    }

    updateStatusBadge(currentState.status);

    switch (currentState.status) {
        case 'setup':
            showWaitingView();
            break;
        case 'running':
            showGameView();
            break;
        case 'ended':
            showResultView();
            break;
        default:
            showWaitingView();
    }
}

// ステータスバッジ更新
function updateStatusBadge(status) {
    const badge = document.getElementById('gameStatus');
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    badge.className = `status ${status}`;
}

// 待機画面
function showWaitingView() {
    document.getElementById('waitingView').classList.remove('hidden');
    document.getElementById('gameView').classList.add('hidden');
    document.getElementById('resultView').classList.add('hidden');
    stopTimerUpdate();
}

// ゲーム画面
function showGameView() {
    document.getElementById('waitingView').classList.add('hidden');
    document.getElementById('gameView').classList.remove('hidden');
    document.getElementById('resultView').classList.add('hidden');

    renderBoard(document.getElementById('board'), currentState, { showLinks: true });
    renderScoreboard(document.getElementById('scoreboard'), currentState);
    startTimerUpdate();
}

// 結果画面
function showResultView() {
    document.getElementById('waitingView').classList.add('hidden');
    document.getElementById('gameView').classList.add('hidden');
    document.getElementById('resultView').classList.remove('hidden');

    renderBoard(document.getElementById('finalBoard'), currentState, { showLinks: false });
    renderScoreboard(document.getElementById('finalScoreboard'), currentState);
    stopTimerUpdate();

    // 勝者表示
    const winners = determineWinner(currentState);
    const winnerDisplay = document.getElementById('winnerDisplay');
    if (winners && winners.length > 0) {
        if (winners.length === 1) {
            winnerDisplay.textContent = `Winner: ${winners[0].name}`;
            winnerDisplay.style.color = winners[0].color || TEAM_COLORS[0];
        } else {
            winnerDisplay.textContent = 'Draw!';
            winnerDisplay.style.color = '#fff';
        }
    }
}

// ポーリング
function startPolling() {
    updateView();
    pollingInterval = setInterval(updateView, 3000);
}

// タイマー更新
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
