// AtCoder Panel Dash - 共通処理

const TEAM_COLORS = [
    '#e74c3c', // Red
    '#3498db', // Blue
    '#2ecc71', // Green
    '#f39c12', // Orange
];

// API呼び出し
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    const response = await fetch(endpoint, options);
    return response.json();
}

// ゲーム状態取得
async function fetchGameState() {
    return apiCall('/api/game');
}

// 盤面を描画
function renderBoard(boardElement, state, options = {}) {
    const { showLinks = true, spectateMode = false } = options;

    if (!state) {
        boardElement.innerHTML = '<p>No game data</p>';
        return;
    }

    const size = state.board_size;
    const cellSize = spectateMode ? 120 : 80;

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
                // 問題ID表示
                if (cell.problem_id) {
                    const problemIdSpan = document.createElement('span');
                    problemIdSpan.className = 'problem-id';
                    problemIdSpan.textContent = cell.problem_id;
                    cellElement.appendChild(problemIdSpan);
                }

                // 問題リンク表示（参加者画面のみ）
                if (showLinks && cell.problem_url) {
                    const link = document.createElement('a');
                    link.className = 'problem-link';
                    link.href = cell.problem_url;
                    link.target = '_blank';
                    link.textContent = 'Open';
                    cellElement.appendChild(link);
                }

                // 獲得済みの場合
                if (cell.captured_by_team_id) {
                    cellElement.style.backgroundColor = teamColors[cell.captured_by_team_id];
                    cellElement.classList.add('captured');

                    if (cell.captured_by_user) {
                        const userSpan = document.createElement('span');
                        userSpan.className = 'captured-user';
                        userSpan.textContent = cell.captured_by_user;
                        cellElement.appendChild(userSpan);
                    }
                }
            }

            boardElement.appendChild(cellElement);
        }
    }
}

// スコアボードを描画
function renderScoreboard(scoreboardElement, state, spectateMode = false) {
    if (!state || !state.teams) {
        scoreboardElement.innerHTML = '';
        return;
    }

    const scores = state.scores || {};

    scoreboardElement.innerHTML = state.teams.map((team, index) => {
        const color = team.color || TEAM_COLORS[index % TEAM_COLORS.length];
        const score = scores[team.id] || 0;
        return `
            <div class="score-card" style="background: ${color};">
                <div class="team-name">${escapeHtml(team.name)}</div>
                <div class="score">${score}</div>
            </div>
        `;
    }).join('');
}

// タイマー表示
function formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimer(timerElement, state) {
    if (!state || !state.time_limit || state.time_limit === 0) {
        timerElement.textContent = '--:--';
        timerElement.className = 'timer';
        return;
    }

    const elapsed = Math.floor(Date.now() / 1000) - state.started_at;
    const remaining = Math.max(0, state.time_limit * 60 - elapsed);

    timerElement.textContent = formatTime(remaining);

    if (remaining <= 60) {
        timerElement.className = 'timer danger';
    } else if (remaining <= 180) {
        timerElement.className = 'timer warning';
    } else {
        timerElement.className = 'timer';
    }

    return remaining;
}

// 勝者を判定
function determineWinner(state) {
    if (!state || !state.scores || !state.teams) return null;

    let maxScore = -1;
    let winners = [];

    state.teams.forEach(team => {
        const score = state.scores[team.id] || 0;
        if (score > maxScore) {
            maxScore = score;
            winners = [team];
        } else if (score === maxScore) {
            winners.push(team);
        }
    });

    return winners;
}

// HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
