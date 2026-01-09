"""AtCoder Problems API連携"""

import requests

from game.database import get_all_members_with_teams, get_uncaptured_cells, capture_cell

API_BASE = "https://kenkoooo.com/atcoder/atcoder-api/v3"
REQUEST_TIMEOUT = 10


def fetch_submissions(from_second):
    """指定時刻以降の全提出を取得"""
    url = f"{API_BASE}/from/{from_second}"
    try:
        response = requests.get(url, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"API error: {e}")
        return []


def check_ac(state, submissions):
    """提出をチェックしてAC判定・セル獲得"""
    if not submissions:
        return

    members_teams = get_all_members_with_teams()
    if not members_teams:
        return

    uncaptured = get_uncaptured_cells()
    if not uncaptured:
        return

    problem_to_cell = {cell['problem_id']: cell['id'] for cell in uncaptured}
    started_at = state.get('started_at', 0)

    # AC提出を時刻順にフィルタ・ソート
    ac_submissions = sorted(
        (s for s in submissions if is_valid_ac_submission(s, members_teams, problem_to_cell, started_at)),
        key=lambda s: s.get('epoch_second', 0)
    )

    # セル獲得処理
    for sub in ac_submissions:
        user_id = sub['user_id'].lower()
        problem_id = sub['problem_id']

        if problem_id not in problem_to_cell:
            continue

        cell_id = problem_to_cell[problem_id]
        team_id = members_teams[user_id]

        if capture_cell(cell_id, team_id, user_id, sub['epoch_second']):
            print(f"Cell captured: {problem_id} by {user_id} (team {team_id})")
            del problem_to_cell[problem_id]


def is_valid_ac_submission(submission, members_teams, problem_to_cell, started_at):
    """有効なAC提出かどうかを判定"""
    return (
        submission.get('result') == 'AC'
        and submission.get('user_id', '').lower() in members_teams
        and submission.get('problem_id') in problem_to_cell
        and submission.get('epoch_second', 0) >= started_at
    )
