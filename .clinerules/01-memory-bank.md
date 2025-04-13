# ブロック崩し ゲーム メモリバンク

## プロジェクト概要

- Next.js（App Router）を使用したブロック崩しゲーム
- キャンバスベースのゲーム実装
- レベルシステムによる難易度調整機能
- 日本語 UI によるユーザーフレンドリーな操作性

## 技術スタック

- Next.js (App Router)
- TypeScript
- Canvas API
- CSS Modules

## ゲームの主要機能

### ゲームメカニクス

- パドルの移動: 左右矢印キーで制御
- ボールの反射: パドルとブロックの衝突で方向変更
- スコアシステム: ブロックを破壊するごとにスコア加算
- レベルシステム: レベルに応じてブロック数と難易度が変化
- ボールの状態管理:
  - ボールの速度（dx, dy）を使用してボールが発射されたかどうかを判断
  - 速度が 0 の場合はパドルに追従
  - 速度が 0 以外の場合は発射状態として移動

### パワーアップシステム

- アイテムの種類:
  - 赤アイテム: 追加のボールを生成
  - 緑アイテム: パドルの幅を増加（重複取得可能）
- パドル幅パワーアップの仕様:
  - 基本幅: 75px
  - 1 回の取得で 25px 増加
  - 複数回取得で効果が重複（例: 2 回取得で 125px、3 回で 150px）
  - 効果持続時間: 10 秒
  - 複数取得時は個別にタイマー管理
  - 期限切れ時は 1 つずつ効果が減少
- アイテムのドロップ確率: 30%

### レベルシステム

- レベル選択範囲: 1-5
- ブロック数の計算:
  - 行数 = min(3 + floor(level / 2), 8)
  - 列数 = min(5 + level, 12)
- 難易度調整:
  - レベルアップ時にボール速度が 1.3 倍に増加
  - ブロック数が増加

### ゲーム状態管理

- スコア管理
- ハイスコア管理（ローカルストレージに保存）
- レベル管理
- ゲーム状態（開始前、プレイ中、ゲームオーバー、クリア）
- ブロック状態の追跡
- パワーアップ状態の管理:
  - 現在のパワーアップ数
  - パドルの現在の幅
  - タイマー ID

### UI 要素

- ゲーム情報表示
  - 現在のスコア
  - ハイスコア
  - 現在のレベル
  - ボール数
  - パワーアップ数
- スタート画面
  - レベル選択 UI
  - スタートボタン
  - 操作説明
- ゲームオーバー画面
  - スコア表示
  - ハイスコア表示
  - レベル表示
  - リスタートボタン（同じレベルでリトライ）
- レベルクリア画面
  - スコア表示
  - ハイスコア表示
  - 次のレベル選択 UI
  - 次のレベル/リスタートボタン

## 定数設定

```typescript
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH = 75;
const BALL_RADIUS = 10;
const BLOCK_WIDTH = 55;
const BLOCK_HEIGHT = 20;
const BLOCK_PADDING = 8;
const BLOCK_OFFSET_TOP = 30;
const BASE_BALL_SPEED = 4;
const ITEM_RADIUS = 8;
const ITEM_SPEED = 2;
const ITEM_DROP_CHANCE = 0.3;
const PADDLE_WIDTH_INCREASE = 25;
const POWER_UP_DURATION = 10000;
```

## コードの重要なポイント

### ブロックの初期化

```typescript
const BLOCK_ROW_COUNT = Math.min(3 + Math.floor(level / 2), 8);
const BLOCK_COLUMN_COUNT = Math.min(5 + level, 12);
```

### パドルの衝突判定とボール方向の計算

```typescript
const paddleCenter = paddleX + currentPaddleWidth / 2;
const ballDistanceFromCenter = ballX - paddleCenter;
setBallDX(ballDistanceFromCenter * 0.15);
```

### ブロックの色分け

```typescript
const colors = ["#FF5252", "#FF9800", "#FFEB3B", "#4CAF50", "#2196F3"];
return colors[row % colors.length];
```

### ブロックの中央揃え

```typescript
// Calculate total width of blocks and center offset
const totalBlockWidth =
  (BLOCK_WIDTH + BLOCK_PADDING) * BLOCK_COLUMN_COUNT - BLOCK_PADDING;
const offsetLeft = (canvasWidth - totalBlockWidth) / 2;

// Draw blocks with center alignment
const blockX = c * (BLOCK_WIDTH + BLOCK_PADDING) + offsetLeft;
```

### パワーアップ管理

```typescript
// パワーアップ数の更新と幅の計算
setPaddleWidthPowerUps((prev) => {
  const newCount = prev + 1;
  const newWidth = PADDLE_WIDTH + PADDLE_WIDTH_INCREASE * newCount;
  setCurrentPaddleWidth(newWidth);
  return newCount;
});

// パワーアップの期限切れ処理
setTimeout(() => {
  setPaddleWidthPowerUps((current) => {
    const updatedCount = current - 1;
    if (updatedCount > 0) {
      setCurrentPaddleWidth(
        PADDLE_WIDTH + PADDLE_WIDTH_INCREASE * updatedCount
      );
    } else {
      setCurrentPaddleWidth(PADDLE_WIDTH);
    }
    return updatedCount;
  });
}, POWER_UP_DURATION);
```

### リスタート機能

```typescript
// Restart game
const restartGame = () => {
  setScore(0);
  // ゲームオーバー時は現在のレベルを維持
  const restartLevel = gameOver ? level : selectedLevel;
  setLevel(restartLevel);
  // パワーアップ状態のリセット
  setPaddleWidthPowerUps(0);
  setCurrentPaddleWidth(PADDLE_WIDTH);
  // ...
};
```

### ハイスコアシステム

- ローカルストレージを使用してハイスコアを永続化
- スコアがハイスコアを超えた場合に自動更新
- ゲーム画面、ゲームオーバー画面、クリア画面でのハイスコア表示

```typescript
// ハイスコアのロード
useEffect(() => {
  const savedHighScore = localStorage.getItem("blockBreakerHighScore");
  if (savedHighScore) {
    setHighScore(parseInt(savedHighScore, 10));
  }
}, []);

// ハイスコアの更新
useEffect(() => {
  if (score > highScore) {
    setHighScore(score);
    localStorage.setItem("blockBreakerHighScore", score.toString());
  }
}, [score, highScore]);
```

## 日本語対応

- 全ての UI テキストを日本語化
- HTML のタイトルを「ブロック崩し」に設定
- HTML の lang 属性を「ja」に設定
- メタデータの説明文も日本語化

```typescript
export const metadata: Metadata = {
  title: "ブロック崩し",
  description: "Next.jsとTypeScriptで作られたブロック崩しゲーム",
};
```

## 今後の改善点の可能性

1. パワーアップアイテムの種類追加
2. 異なるブロックパターンの実装
3. サウンドエフェクトの追加
4. モバイル対応（タッチ操作）の実装
5. パワーアップ効果の視覚的なフィードバック強化
