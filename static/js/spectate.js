// AtCoder Panel Dash - 観戦画面（大画面表示用）

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

    renderSpectateBoard(document.getElementById('board'), currentState);
    renderScoreboard(document.getElementById('scoreboard'), currentState, true);
    startTimerUpdate();
}

// 結果画面
function showResultView() {
    document.getElementById('waitingView').classList.add('hidden');
    document.getElementById('gameView').classList.add('hidden');
    document.getElementById('resultView').classList.remove('hidden');

    renderScoreboard(document.getElementById('finalScoreboard'), currentState, true);
    stopTimerUpdate();

    // 勝者表示
    const winners = determineWinner(currentState);
    const winnerDisplay = document.getElementById('winnerDisplay');
    if (winners && winners.length > 0) {
        if (winners.length === 1) {
            winnerDisplay.textContent = winners[0].name;
            winnerDisplay.style.color = winners[0].color || TEAM_COLORS[0];
        } else {
            winnerDisplay.textContent = 'Draw!';
            winnerDisplay.style.color = '#fff';
        }
    }
}

// 観戦用盤面描画（問題IDとユーザー名表示、リンクなし）
function renderSpectateBoard(boardElement, state) {
    if (!state) {
        boardElement.innerHTML = '<p>No game data</p>';
        return;
    }

    const size = state.board_size;
    // 画面サイズに合わせてセルサイズを計算
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const availableHeight = viewportHeight - 300; // ヘッダー・スコアボード分を引く
    const availableWidth = viewportWidth - 100;
    const maxCellSize = Math.min(
        Math.floor(availableHeight / size) - 10,
        Math.floor(availableWidth / size) - 10,
        150
    );
    const cellSize = Math.max(80, maxCellSize);

    boardElement.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    boardElement.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;

    // チームIDから色を取得するマップ
    const teamColors = {};
    state.teams.forEach((team, index) => {
        teamColors[team.id] = team.color || TEAM_COLORS[index % TEAM_COLORS.length];
    });

    boardElement.innerHTML = '';

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = state.cells.find(c => c.row === row && c.col === col);
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';

            if (cell) {
                // 問題ID表示（テキストのみ、リンクなし）
                if (cell.problem_id) {
                    const problemIdSpan = document.createElement('span');
                    problemIdSpan.className = 'problem-id';
                    problemIdSpan.style.fontSize = '1rem';
                    problemIdSpan.textContent = cell.problem_id;
                    cellElement.appendChild(problemIdSpan);
                }

                // 獲得済みの場合
                if (cell.captured_by_team_id) {
                    cellElement.style.backgroundColor = teamColors[cell.captured_by_team_id];
                    cellElement.classList.add('captured');

                    // ユーザー名表示
                    if (cell.captured_by_user) {
                        const userSpan = document.createElement('span');
                        userSpan.className = 'captured-user';
                        userSpan.style.fontSize = '1rem';
                        userSpan.textContent = cell.captured_by_user;
                        cellElement.appendChild(userSpan);
                    }
                }
            }

            boardElement.appendChild(cellElement);
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

// ウィンドウリサイズ時に盤面を再描画
window.addEventListener('resize', () => {
    if (currentState && currentState.status === 'running') {
        renderSpectateBoard(document.getElementById('board'), currentState);
    }
});
