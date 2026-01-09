"""AtCoder Panel Dash - メインアプリケーション"""

import threading
import time
from functools import wraps

from flask import Flask, render_template, jsonify, request

from game.database import init_db, get_game_state, save_game_setup, start_game, end_game
from game.atcoder_api import fetch_submissions, check_ac
from game.scoring import calculate_scores

app = Flask(__name__)

polling_thread = None
polling_active = False

POLLING_INTERVAL = 5
SUBMISSION_LOOKBACK = 60


def api_response(func):
    """APIエンドポイント用デコレータ（エラーハンドリング共通化）"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
            return jsonify({'success': True, **result}) if isinstance(result, dict) else jsonify({'success': True})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 400
    return wrapper


# ページルーティング
@app.route('/')
def viewer():
    """参加者画面"""
    return render_template('viewer.html')


@app.route('/spectate')
def spectate():
    """観戦画面（大画面表示用）"""
    return render_template('spectate.html')


@app.route('/master')
def master():
    """ゲームマスター画面"""
    return render_template('master.html')


# APIエンドポイント
@app.route('/api/game', methods=['GET'])
def api_get_game():
    """ゲーム状態取得"""
    state = get_game_state()
    if state:
        state['scores'] = calculate_scores(state)
    return jsonify(state)


@app.route('/api/game/setup', methods=['POST'])
@api_response
def api_setup_game():
    """ゲーム設定"""
    save_game_setup(request.get_json())


@app.route('/api/game/start', methods=['POST'])
@api_response
def api_start_game():
    """ゲーム開始"""
    global polling_thread, polling_active

    start_game()
    polling_active = True
    polling_thread = threading.Thread(target=polling_loop, daemon=True)
    polling_thread.start()


@app.route('/api/game/end', methods=['POST'])
@api_response
def api_end_game():
    """ゲーム終了"""
    global polling_active

    polling_active = False
    end_game()


@app.route('/api/game/refresh', methods=['POST'])
@api_response
def api_refresh_game():
    """手動更新"""
    check_submissions()


def polling_loop():
    """定期的にAtCoder APIをポーリング"""
    while polling_active:
        try:
            check_submissions()
        except Exception as e:
            print(f"Polling error: {e}")
        time.sleep(POLLING_INTERVAL)


def check_submissions():
    """提出をチェックしてAC判定"""
    state = get_game_state()
    if not state or state['status'] != 'running':
        return

    from_time = int(time.time()) - SUBMISSION_LOOKBACK
    submissions = fetch_submissions(from_time)
    check_ac(state, submissions)


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
