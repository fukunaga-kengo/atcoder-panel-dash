"""スコア計算（連結成分）"""

from collections import deque


def calculate_scores(state):
    """各チームのスコア（連結成分の最大サイズ）を計算"""
    if not state:
        return {}

    board_size = state['board_size']
    cells = state['cells']
    teams = state['teams']

    # 盤面を2次元配列に変換（チームIDを格納）
    board = [[None for _ in range(board_size)] for _ in range(board_size)]

    for cell in cells:
        row, col = cell['row'], cell['col']
        if 0 <= row < board_size and 0 <= col < board_size:
            board[row][col] = cell['captured_by_team_id']

    # 各チームの連結成分最大サイズを計算
    scores = {}
    for team in teams:
        team_id = team['id']
        max_component = find_max_component(board, board_size, team_id)
        scores[team_id] = max_component

    return scores


def find_max_component(board, board_size, team_id):
    """指定チームの連結成分の最大サイズをBFSで求める"""
    visited = [[False for _ in range(board_size)] for _ in range(board_size)]
    max_size = 0

    # 上下左右の移動
    directions = [(-1, 0), (1, 0), (0, -1), (0, 1)]

    for start_row in range(board_size):
        for start_col in range(board_size):
            if board[start_row][start_col] != team_id:
                continue
            if visited[start_row][start_col]:
                continue

            # BFS開始
            size = 0
            queue = deque([(start_row, start_col)])
            visited[start_row][start_col] = True

            while queue:
                row, col = queue.popleft()
                size += 1

                for dr, dc in directions:
                    nr, nc = row + dr, col + dc
                    if 0 <= nr < board_size and 0 <= nc < board_size:
                        if not visited[nr][nc] and board[nr][nc] == team_id:
                            visited[nr][nc] = True
                            queue.append((nr, nc))

            max_size = max(max_size, size)

    return max_size


def check_game_complete(state):
    """ゲーム終了条件をチェック"""
    if not state:
        return False

    cells = state['cells']

    # 全マスが獲得されたか
    all_captured = all(cell['captured_by_team_id'] is not None for cell in cells)

    return all_captured
