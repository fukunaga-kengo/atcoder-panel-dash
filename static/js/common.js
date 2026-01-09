// AtCoder Panel Dash - 共通処理

const TEAM_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
const POLLING_INTERVAL = 3000;

// API呼び出し
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (data) {
        options.body = JSON.stringify(data);
    }
    return fetch(endpoint, options).then(res => res.json());
}

// ゲーム状態取得
function fetchGameState() {
    return apiCall('/api/game');
}

// ビュー切り替えヘルパー
function showView(viewId, views) {
    views.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.classList.toggle('hidden', id !== viewId);
        }
    });
}

// チームカラーマップを構築
function buildTeamColorMap(teams) {
    const map = {};
    teams.forEach((team, index) => {
        map[team.id] = team.color || TEAM_COLORS[index % TEAM_COLORS.length];
    });
    return map;
}

// 盤面を描画
function renderBoard(boardElement, state, options = {}) {
    const { showLinks = true, cellSize = 80 } = options;

    if (!state) {
        boardElement.innerHTML = '<p>No game data</p>';
        return;
    }

    const size = state.board_size;
    const teamColors = buildTeamColorMap(state.teams);

    boardElement.style.gridTemplateColumns = `repeat(${size}, ${cellSize}px)`;
    boardElement.style.gridTemplateRows = `repeat(${size}, ${cellSize}px)`;
    boardElement.innerHTML = '';

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = state.cells.find(c => c.row === row && c.col === col);
            const cellElement = createCellElement(cell, teamColors, showLinks);
            boardElement.appendChild(cellElement);
        }
    }
}

// セル要素を作成
function createCellElement(cell, teamColors, showLinks) {
    const cellElement = document.createElement('div');
    cellElement.className = 'cell';

    if (!cell) return cellElement;

    if (cell.problem_id) {
        const problemIdSpan = document.createElement('span');
        problemIdSpan.className = 'problem-id';
        problemIdSpan.textContent = cell.problem_id;
        cellElement.appendChild(problemIdSpan);
    }

    if (showLinks && cell.problem_url) {
        const link = document.createElement('a');
        link.className = 'problem-link';
        link.href = cell.problem_url;
        link.target = '_blank';
        link.textContent = 'Open';
        cellElement.appendChild(link);
    }

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

    return cellElement;
}

// スコアボードを描画
function renderScoreboard(scoreboardElement, state) {
    if (!state || !state.teams) {
        scoreboardElement.innerHTML = '';
        return;
    }

    const scores = state.scores || {};
    scoreboardElement.innerHTML = state.teams
        .map((team, index) => {
            const color = team.color || TEAM_COLORS[index % TEAM_COLORS.length];
            return `
                <div class="score-card" style="background: ${color};">
                    <div class="team-name">${escapeHtml(team.name)}</div>
                    <div class="score">${scores[team.id] || 0}</div>
                </div>
            `;
        })
        .join('');
}

// タイマー表示
function formatTime(seconds) {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimer(timerElement, state) {
    if (!state || !state.time_limit) {
        timerElement.textContent = '--:--';
        timerElement.className = 'timer';
        return null;
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

// 勝者表示を更新
function displayWinner(winnerElement, state) {
    const winners = determineWinner(state);
    if (!winners || winners.length === 0) return;

    if (winners.length === 1) {
        winnerElement.textContent = `Winner: ${winners[0].name}`;
        winnerElement.style.color = winners[0].color || TEAM_COLORS[0];
    } else {
        winnerElement.textContent = 'Draw!';
        winnerElement.style.color = '#fff';
    }
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
