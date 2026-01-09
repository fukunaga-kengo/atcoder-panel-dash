// AtCoder Panel Dash - マスター画面

let currentState = null;
let pollingInterval = null;
let timerInterval = null;

const VIEWS = ['setupView', 'gameView', 'resultView'];

document.addEventListener('DOMContentLoaded', async () => {
    await loadGameState();
    generateSetup();
});

async function loadGameState() {
    currentState = await fetchGameState();

    if (!currentState) return;

    updateStatusBadge(currentState.status);

    if (currentState.status === 'running') {
        showGameView();
        startPolling();
    } else if (currentState.status === 'ended') {
        showResultView();
    } else {
        showSetupView();
        restoreSetup();
    }
}

function updateStatusBadge(status) {
    const badge = document.getElementById('gameStatus');
    badge.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    badge.className = `status ${status}`;
}

function showSetupView() {
    showView('setupView', VIEWS);
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
}

// セットアップ生成
function generateSetup() {
    const boardSize = parseInt(document.getElementById('boardSize').value) || 5;
    const teamCount = parseInt(document.getElementById('teamCount').value) || 2;

    generateTeamsConfig(teamCount);
    generateProblemGrid(boardSize);
}

// チーム設定生成
function generateTeamsConfig(count) {
    const container = document.getElementById('teamsContainer');
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const color = TEAM_COLORS[i % TEAM_COLORS.length];
        const div = document.createElement('div');
        div.className = 'team-config';
        div.innerHTML = `
            <h3>
                <span class="color-preview" style="background: ${color};"></span>
                Team ${i + 1}
            </h3>
            <div class="form-group">
                <label>Team Name</label>
                <input type="text" class="team-name-input" value="Team ${i + 1}" data-team="${i}">
            </div>
            <div class="form-group">
                <label>Color</label>
                <input type="color" class="team-color-input" value="${color}" data-team="${i}"
                    onchange="this.previousElementSibling.previousElementSibling.querySelector('.color-preview').style.background = this.value">
            </div>
            <div class="team-members">
                <label>Members (AtCoder IDs, one per line)</label>
                <textarea class="team-members-input" data-team="${i}" placeholder="example_user1&#10;example_user2"></textarea>
            </div>
        `;
        container.appendChild(div);
    }
}

// 問題グリッド生成
function generateProblemGrid(size) {
    const grid = document.getElementById('problemGrid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${Math.min(size, 3)}, 1fr)`;

    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const div = document.createElement('div');
            div.className = 'problem-input';
            div.innerHTML = `
                <label>(${row},${col})</label>
                <input type="text" class="problem-url-input" data-row="${row}" data-col="${col}"
                    placeholder="Problem URL">
            `;
            grid.appendChild(div);
        }
    }
}

// 設定を復元
function restoreSetup() {
    if (!currentState) return;

    document.getElementById('boardSize').value = currentState.board_size;
    document.getElementById('teamCount').value = currentState.teams.length;

    generateTeamsConfig(currentState.teams.length);
    generateProblemGrid(currentState.board_size);

    // チーム設定復元
    currentState.teams.forEach((team, index) => {
        const nameInput = document.querySelector(`.team-name-input[data-team="${index}"]`);
        const colorInput = document.querySelector(`.team-color-input[data-team="${index}"]`);
        const membersInput = document.querySelector(`.team-members-input[data-team="${index}"]`);

        if (nameInput) nameInput.value = team.name;
        if (colorInput) {
            colorInput.value = team.color;
            const preview = colorInput.closest('.team-config').querySelector('.color-preview');
            if (preview) preview.style.background = team.color;
        }
        if (membersInput) membersInput.value = team.members.join('\n');
    });

    // 問題URL復元
    currentState.cells.forEach(cell => {
        const input = document.querySelector(`.problem-url-input[data-row="${cell.row}"][data-col="${cell.col}"]`);
        if (input && cell.problem_url) {
            input.value = cell.problem_url;
        }
    });
}

// 設定を保存
async function saveSetup() {
    const boardSize = parseInt(document.getElementById('boardSize').value);
    const timeLimit = parseInt(document.getElementById('timeLimit').value) || 0;

    // チーム情報収集
    const teams = [];
    document.querySelectorAll('.team-config').forEach((config, index) => {
        const name = config.querySelector('.team-name-input').value;
        const color = config.querySelector('.team-color-input').value;
        const membersText = config.querySelector('.team-members-input').value;
        const members = membersText.split('\n').map(m => m.trim()).filter(m => m);

        teams.push({ name, color, members });
    });

    // セル情報収集
    const cells = [];
    document.querySelectorAll('.problem-url-input').forEach(input => {
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);
        const problem_url = input.value.trim();
        cells.push({ row, col, problem_url });
    });

    const data = {
        board_size: boardSize,
        time_limit: timeLimit,
        teams,
        cells
    };

    try {
        const result = await apiCall('/api/game/setup', 'POST', data);
        if (result.success) {
            document.getElementById('startBtn').disabled = false;
            alert('Setup saved successfully!');
            await loadGameState();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (e) {
        alert('Error saving setup: ' + e.message);
    }
}

// ゲーム開始
async function startGame() {
    if (!confirm('Start the game?')) return;

    try {
        const result = await apiCall('/api/game/start', 'POST');
        if (result.success) {
            await loadGameState();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (e) {
        alert('Error starting game: ' + e.message);
    }
}

// ゲーム終了
async function endGame() {
    if (!confirm('End the game?')) return;

    try {
        const result = await apiCall('/api/game/end', 'POST');
        if (result.success) {
            stopPolling();
            stopTimerUpdate();
            await loadGameState();
        } else {
            alert('Error: ' + result.error);
        }
    } catch (e) {
        alert('Error ending game: ' + e.message);
    }
}

// 手動更新
async function refreshGame() {
    try {
        await apiCall('/api/game/refresh', 'POST');
        await updateGameView();
    } catch (e) {
        console.error('Refresh error:', e);
    }
}

// ゲーム画面更新
async function updateGameView() {
    currentState = await fetchGameState();

    if (!currentState) return;

    updateStatusBadge(currentState.status);

    if (currentState.status === 'ended') {
        stopPolling();
        stopTimerUpdate();
        showResultView();
        return;
    }

    renderBoard(document.getElementById('board'), currentState, { showLinks: true });
    renderScoreboard(document.getElementById('scoreboard'), currentState);
}

function startPolling() {
    if (pollingInterval) return;
    pollingInterval = setInterval(updateGameView, POLLING_INTERVAL);
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

function startTimerUpdate() {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
        const remaining = updateTimer(document.getElementById('timer'), currentState);
        if (remaining === 0 && currentState && currentState.status === 'running') {
            endGame();
        }
    }, 1000);
}

function stopTimerUpdate() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function newGame() {
    location.reload();
}

document.getElementById('boardSize').addEventListener('change', generateSetup);
document.getElementById('teamCount').addEventListener('change', generateSetup);
