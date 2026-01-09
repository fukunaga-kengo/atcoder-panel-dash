# AtCoder Panel Dash

N×Nマスの陣取りゲーム。チームに分かれてAtCoderの問題を解き、先にACしたチームがそのマスを獲得します。

## 特徴

- **N×Nの盤面**: ゲームマスターが自由にサイズを設定（2〜10）
- **2〜4チーム対戦**: 各チームに複数のAtCoderユーザーを登録可能
- **自動AC判定**: AtCoder Problems APIを5秒ごとにポーリング
- **連結成分スコア**: 上下左右に隣接する獲得マスの最大連結サイズがスコア
- **3種類の画面**: マスター用、参加者用、観戦用（大画面表示）

## セットアップ

```bash
# 依存関係のインストール
uv sync

# サーバー起動
uv run python app.py
```

## 画面一覧

| 画面 | URL | 説明 |
|------|-----|------|
| マスター | http://localhost:5000/master | ゲーム設定・管理（localhost専用） |
| 参加者 | http://localhost:5000/ | 盤面表示・問題リンク |
| 観戦 | http://localhost:5000/spectate | 大画面表示用（プロジェクター向け） |

## 使い方

### 1. ゲーム設定（マスター画面）

1. http://localhost:5000/master にアクセス
2. 盤面サイズ（N×N）を設定
3. チーム数を選択（2〜4）
4. 各チームの名前・色・メンバー（AtCoder ID）を入力
5. 各マスに問題URLを設定
   - 例: `https://atcoder.jp/contests/abc001/tasks/abc001_a`
6. 「Save Setup」をクリック
7. 「Start Game」をクリックしてゲーム開始

### 2. 参加者への共有

ngrokを使って参加者に共有：

```bash
ngrok http 5000
```

生成されたURL（例: `https://xxxx.ngrok.io`）を参加者に共有。

### 3. ゲーム進行

- 参加者はAtCoderで問題を解く
- ACすると自動的にマスが獲得される（5秒ごとに更新）
- 同じ問題を複数チームがACした場合、提出時刻が早い方が獲得

### 4. 勝敗判定

- スコア = チームが獲得したマスの連結成分の最大サイズ
- 終了条件:
  - 全マスが埋まる
  - 制限時間経過（設定時）
  - マスターが手動終了

## 技術スタック

- **バックエンド**: Python Flask
- **データベース**: SQLite
- **フロントエンド**: HTML/CSS/JavaScript（フレームワークなし）
- **API**: AtCoder Problems API

## ファイル構成

```
atcoder-panel-dash/
├── app.py                 # Flaskアプリ本体
├── pyproject.toml         # uv依存関係
├── game/
│   ├── database.py        # SQLite操作
│   ├── atcoder_api.py     # AtCoder Problems API連携
│   └── scoring.py         # 連結成分スコア計算
├── static/
│   ├── css/style.css
│   └── js/
│       ├── common.js      # 共通処理
│       ├── master.js      # マスター画面用
│       ├── viewer.js      # 参加者画面用
│       └── spectate.js    # 観戦画面用
├── templates/
│   ├── master.html
│   ├── viewer.html
│   └── spectate.html
└── data/
    └── game.db            # SQLiteデータベース
```

## API

| メソッド | エンドポイント | 説明 |
|---------|---------------|------|
| GET | `/api/game` | ゲーム状態取得 |
| POST | `/api/game/setup` | ゲーム設定保存 |
| POST | `/api/game/start` | ゲーム開始 |
| POST | `/api/game/end` | ゲーム終了 |
| POST | `/api/game/refresh` | 手動更新 |

## 注意事項

- AtCoder Problems APIの利用制限（1秒以上の間隔）を守るため、ポーリング間隔は5秒に設定
- ゲーム開始後の提出のみがAC判定の対象
