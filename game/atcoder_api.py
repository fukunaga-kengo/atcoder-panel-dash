"""AtCoder Problems API連携"""

import requests
from game.database import (
    get_all_members_with_teams,
    get_uncaptured_cells,
    capture_cell,
    get_game_state
)

API_BASE = "https://kenkoooo.com/atcoder/atcoder-api/v3"


def fetch_submissions(from_second):
    """指定時刻以降の全提出を取得"""
    url = f"{API_BASE}/from/{from_second}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"API error: {e}")
        return []


def check_ac(state, submissions):
    """提出をチェックしてAC判定"""
    if not submissions:
        return

    # メンバーとチームのマッピング
    members_teams = get_all_members_with_teams()
    if not members_teams:
        return

    # 未獲得セルとその問題ID
    uncaptured = get_uncaptured_cells()
    if not uncaptured:
        return

    # 問題IDからセルIDへのマッピング
    problem_to_cell = {cell['problem_id']: cell['id'] for cell in uncaptured}

    # ゲーム開始時刻
    started_at = state.get('started_at', 0)

    # AC提出を時刻順にソート
    ac_submissions = [
        s for s in submissions
        if s.get('result') == 'AC'
        and s.get('user_id', '').lower() in members_teams
        and s.get('problem_id') in problem_to_cell
        and s.get('epoch_second', 0) >= started_at
    ]

    ac_submissions.sort(key=lambda x: x.get('epoch_second', 0))

    # AC判定・セル獲得
    for sub in ac_submissions:
        user_id = sub.get('user_id', '').lower()
        problem_id = sub.get('problem_id')
        epoch_second = sub.get('epoch_second', 0)

        if problem_id not in problem_to_cell:
            continue

        cell_id = problem_to_cell[problem_id]
        team_id = members_teams.get(user_id)

        if team_id:
            captured = capture_cell(cell_id, team_id, user_id, epoch_second)
            if captured:
                print(f"Cell captured: {problem_id} by {user_id} (team {team_id})")
                # 獲得したセルはマッピングから削除
                del problem_to_cell[problem_id]
