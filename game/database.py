"""SQLiteデータベース操作"""

import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'data' / 'game.db'


@contextmanager
def get_connection():
    """データベース接続を取得（コンテキストマネージャ）"""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """データベース初期化"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                board_size INTEGER NOT NULL,
                time_limit INTEGER,
                status TEXT DEFAULT 'setup',
                started_at INTEGER,
                ended_at INTEGER,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS teams (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                FOREIGN KEY (game_id) REFERENCES games(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS team_members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                team_id INTEGER NOT NULL,
                atcoder_id TEXT NOT NULL,
                FOREIGN KEY (team_id) REFERENCES teams(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS cells (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER NOT NULL,
                row INTEGER NOT NULL,
                col INTEGER NOT NULL,
                problem_url TEXT,
                problem_id TEXT,
                captured_by_team_id INTEGER,
                captured_by_user TEXT,
                captured_at INTEGER,
                FOREIGN KEY (game_id) REFERENCES games(id),
                FOREIGN KEY (captured_by_team_id) REFERENCES teams(id)
            )
        ''')

        conn.commit()


def get_current_game_id():
    """現在のゲームIDを取得"""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM games ORDER BY id DESC LIMIT 1')
        row = cursor.fetchone()
        return row['id'] if row else None


def get_game_state():
    """現在のゲーム状態を取得"""
    game_id = get_current_game_id()
    if not game_id:
        return None

    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM games WHERE id = ?', (game_id,))
        game = cursor.fetchone()
        if not game:
            return None

        cursor.execute('SELECT * FROM teams WHERE game_id = ?', (game_id,))
        teams_rows = cursor.fetchall()

        teams = []
        for team_row in teams_rows:
            cursor.execute('SELECT atcoder_id FROM team_members WHERE team_id = ?', (team_row['id'],))
            members = [m['atcoder_id'] for m in cursor.fetchall()]
            teams.append({
                'id': team_row['id'],
                'name': team_row['name'],
                'color': team_row['color'],
                'members': members
            })

        cursor.execute('SELECT * FROM cells WHERE game_id = ? ORDER BY row, col', (game_id,))
        cells = [
            {
                'id': row['id'],
                'row': row['row'],
                'col': row['col'],
                'problem_url': row['problem_url'],
                'problem_id': row['problem_id'],
                'captured_by_team_id': row['captured_by_team_id'],
                'captured_by_user': row['captured_by_user'],
                'captured_at': row['captured_at']
            }
            for row in cursor.fetchall()
        ]

        return {
            'id': game['id'],
            'board_size': game['board_size'],
            'time_limit': game['time_limit'],
            'status': game['status'],
            'started_at': game['started_at'],
            'ended_at': game['ended_at'],
            'teams': teams,
            'cells': cells
        }


def save_game_setup(data):
    """ゲーム設定を保存"""
    with get_connection() as conn:
        cursor = conn.cursor()

        # 既存のセットアップ中ゲームを削除
        cursor.execute('''
            DELETE FROM team_members WHERE team_id IN (
                SELECT id FROM teams WHERE game_id IN (
                    SELECT id FROM games WHERE status = 'setup'
                )
            )
        ''')
        cursor.execute("DELETE FROM cells WHERE game_id IN (SELECT id FROM games WHERE status = 'setup')")
        cursor.execute("DELETE FROM teams WHERE game_id IN (SELECT id FROM games WHERE status = 'setup')")
        cursor.execute("DELETE FROM games WHERE status = 'setup'")

        # 新規ゲーム作成
        cursor.execute(
            'INSERT INTO games (board_size, time_limit, status) VALUES (?, ?, ?)',
            (data['board_size'], data.get('time_limit'), 'setup')
        )
        game_id = cursor.lastrowid

        # チーム作成
        for team_data in data['teams']:
            cursor.execute(
                'INSERT INTO teams (game_id, name, color) VALUES (?, ?, ?)',
                (game_id, team_data['name'], team_data['color'])
            )
            team_id = cursor.lastrowid

            for member in team_data['members']:
                member = member.strip()
                if member:
                    cursor.execute(
                        'INSERT INTO team_members (team_id, atcoder_id) VALUES (?, ?)',
                        (team_id, member.lower())
                    )

        # セル作成
        for cell_data in data['cells']:
            problem_url = cell_data.get('problem_url', '')
            problem_id = extract_problem_id(problem_url) if problem_url else None
            cursor.execute(
                'INSERT INTO cells (game_id, row, col, problem_url, problem_id) VALUES (?, ?, ?, ?, ?)',
                (game_id, cell_data['row'], cell_data['col'], problem_url, problem_id)
            )

        conn.commit()


def extract_problem_id(url):
    """問題URLから問題IDを抽出

    例: https://atcoder.jp/contests/abc001/tasks/abc001_a -> abc001_a
    """
    if not url or '/tasks/' not in url:
        return None

    path = url.split('/tasks/')[-1]
    return path.split('?')[0].split('#')[0] or None


def start_game():
    """ゲームを開始"""
    game_id = get_current_game_id()
    if not game_id:
        raise ValueError("No game to start")

    with get_connection() as conn:
        conn.execute(
            'UPDATE games SET status = ?, started_at = ? WHERE id = ?',
            ('running', int(time.time()), game_id)
        )
        conn.commit()


def end_game():
    """ゲームを終了"""
    game_id = get_current_game_id()
    if not game_id:
        raise ValueError("No game to end")

    with get_connection() as conn:
        conn.execute(
            'UPDATE games SET status = ?, ended_at = ? WHERE id = ?',
            ('ended', int(time.time()), game_id)
        )
        conn.commit()


def capture_cell(cell_id, team_id, user_id, captured_at):
    """セルを獲得（未獲得の場合のみ）"""
    with get_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('SELECT captured_by_team_id FROM cells WHERE id = ?', (cell_id,))
        row = cursor.fetchone()
        if row and row['captured_by_team_id'] is not None:
            return False

        cursor.execute(
            'UPDATE cells SET captured_by_team_id = ?, captured_by_user = ?, captured_at = ? WHERE id = ?',
            (team_id, user_id, captured_at, cell_id)
        )
        conn.commit()
        return True


def get_all_members_with_teams():
    """全メンバーとチームIDのマッピングを取得"""
    game_id = get_current_game_id()
    if not game_id:
        return {}

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT tm.atcoder_id, t.id as team_id
            FROM team_members tm
            JOIN teams t ON tm.team_id = t.id
            WHERE t.game_id = ?
        ''', (game_id,))

        return {row['atcoder_id'].lower(): row['team_id'] for row in cursor.fetchall()}


def get_uncaptured_cells():
    """未獲得のセルを取得"""
    game_id = get_current_game_id()
    if not game_id:
        return []

    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT id, problem_id
            FROM cells
            WHERE game_id = ? AND captured_by_team_id IS NULL AND problem_id IS NOT NULL
        ''', (game_id,))

        return [{'id': row['id'], 'problem_id': row['problem_id']} for row in cursor.fetchall()]
