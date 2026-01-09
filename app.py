"""AtCoder Panel Dash - メインアプリケーション"""

import threading
import time
from flask import Flask, render_template, jsonify, request

from game.database import init_db, get_game_state, save_game_setup, start_game, end_game
from game.atcoder_api import fetch_submissions, check_ac
from game.scoring import calculate_scores

app = Flask(__name__)

# ポーリング制御用
polling_thread = None
polling_active = False


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


# API エンドポイント
@app.route('/api/game', methods=['GET'])
def api_get_game():
    """ゲーム状態取得"""
    state = get_game_state()
    if state:
        scores = calculate_scores(state)
        state['scores'] = scores
    return jsonify(state)


@app.route('/api/game/setup', methods=['POST'])
def api_setup_game():
    """ゲーム設定"""
    data = request.get_json()
    try:
        save_game_setup(data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/game/start', methods=['POST'])
def api_start_game():
    """ゲーム開始"""
    global polling_thread, polling_active

    try:
        start_game()
        polling_active = True
        polling_thread = threading.Thread(target=polling_loop, daemon=True)
        polling_thread.start()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/game/end', methods=['POST'])
def api_end_game():
    """ゲーム終了"""
    global polling_active

    try:
        polling_active = False
        end_game()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


@app.route('/api/game/refresh', methods=['POST'])
def api_refresh_game():
    """手動更新"""
    try:
        check_submissions()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400


def polling_loop():
    """5秒ごとにAtCoder APIをポーリング"""
    global polling_active

    while polling_active:
        try:
            check_submissions()
        except Exception as e:
            print(f"Polling error: {e}")
        time.sleep(5)


def check_submissions():
    """提出をチェックしてAC判定"""
    state = get_game_state()
    if not state or state['status'] != 'running':
        return

    # 過去1分の提出を取得
    current_time = int(time.time())
    from_time = current_time - 60

    submissions = fetch_submissions(from_time)
    check_ac(state, submissions)


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
