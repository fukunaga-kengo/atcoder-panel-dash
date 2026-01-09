"""スコア計算（連結成分）"""

from collections import deque

DIRECTIONS = [(-1, 0), (1, 0), (0, -1), (0, 1)]


def calculate_scores(state):
    """各チームのスコア（連結成分の最大サイズ）を計算"""
    if not state:
        return {}

    board_size = state['board_size']
    board = build_board(state['cells'], board_size)

    return {team['id']: find_max_component(board, board_size, team['id']) for team in state['teams']}


def build_board(cells, board_size):
    """セルリストから2次元盤面配列を構築"""
    board = [[None] * board_size for _ in range(board_size)]
    for cell in cells:
        row, col = cell['row'], cell['col']
        if 0 <= row < board_size and 0 <= col < board_size:
            board[row][col] = cell['captured_by_team_id']
    return board


def find_max_component(board, board_size, team_id):
    """指定チームの連結成分の最大サイズをBFSで求める"""
    visited = [[False] * board_size for _ in range(board_size)]
    max_size = 0

    for start_row in range(board_size):
        for start_col in range(board_size):
            if visited[start_row][start_col] or board[start_row][start_col] != team_id:
                continue

            size = bfs_component_size(board, visited, board_size, team_id, start_row, start_col)
            max_size = max(max_size, size)

    return max_size


def bfs_component_size(board, visited, board_size, team_id, start_row, start_col):
    """BFSで連結成分のサイズを計算"""
    queue = deque([(start_row, start_col)])
    visited[start_row][start_col] = True
    size = 0

    while queue:
        row, col = queue.popleft()
        size += 1

        for dr, dc in DIRECTIONS:
            nr, nc = row + dr, col + dc
            if 0 <= nr < board_size and 0 <= nc < board_size:
                if not visited[nr][nc] and board[nr][nc] == team_id:
                    visited[nr][nc] = True
                    queue.append((nr, nc))

    return size


def check_game_complete(state):
    """ゲーム終了条件をチェック（全マス獲得済みか）"""
    if not state:
        return False
    return all(cell['captured_by_team_id'] is not None for cell in state['cells'])
