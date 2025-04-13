"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Game.module.css";

// Game constants
const PADDLE_HEIGHT = 10;
const PADDLE_WIDTH = 75;
const BALL_RADIUS = 10;
const BLOCK_WIDTH = 55;
const BLOCK_HEIGHT = 20;
const BLOCK_PADDING = 8;
const BLOCK_OFFSET_TOP = 30;
// BLOCK_OFFSET_LEFT is no longer used as we calculate center offset dynamically
const BASE_BALL_SPEED = 4;
const ITEM_RADIUS = 8;
const ITEM_SPEED = 2;
const ITEM_DROP_CHANCE = 0.3; // 30% chance to drop an item
const PADDLE_WIDTH_INCREASE = 25; // Amount to increase paddle width
const POWER_UP_DURATION = 10000; // 10 seconds in milliseconds

// Item types
enum ItemType {
  EXTRA_BALL,
  WIDER_PADDLE,
}

interface Block {
  x: number;
  y: number;
  status: number;
}

interface Item {
  x: number;
  y: number;
  type: ItemType;
  active: boolean;
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  active: boolean;
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameCleared, setGameCleared] = useState(false);
  const [blocks, setBlocks] = useState<Block[][]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [balls, setBalls] = useState<Ball[]>([]);
  const [currentPaddleWidth, setCurrentPaddleWidth] = useState(PADDLE_WIDTH);
  const [paddleWidthPowerUps, setPaddleWidthPowerUps] = useState(0);
  const [paddleWidthTimeoutId, setPaddleWidthTimeoutId] =
    useState<NodeJS.Timeout | null>(null);

  // Calculate block count based on level
  const BLOCK_ROW_COUNT = Math.min(3 + Math.floor(level / 2), 8);
  const BLOCK_COLUMN_COUNT = Math.min(5 + level, 12);

  // Game state
  const [paddleX, setPaddleX] = useState(0);
  const [rightPressed, setRightPressed] = useState(false);
  const [leftPressed, setLeftPressed] = useState(false);
  // Initialize blocks and balls
  useEffect(() => {
    const newBlocks: Block[][] = [];
    for (let c = 0; c < BLOCK_COLUMN_COUNT; c++) {
      newBlocks[c] = [];
      for (let r = 0; r < BLOCK_ROW_COUNT; r++) {
        newBlocks[c][r] = {
          x: 0,
          y: 0,
          status: 1,
        };
      }
    }
    setBlocks(newBlocks);

    // Reset items when level changes
    setItems([]);

    // Initialize with a single ball on the paddle
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      setBalls([
        {
          x: canvasWidth / 2,
          y: canvasHeight - PADDLE_HEIGHT - BALL_RADIUS,
          dx: 0, // Ball doesn't move until launched
          dy: 0,
          active: true,
        },
      ]);
    }
  }, [level, BLOCK_COLUMN_COUNT, BLOCK_ROW_COUNT]);

  // Handle key down event
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Right" || e.key === "ArrowRight") {
        setRightPressed(true);
      } else if (e.key === "Left" || e.key === "ArrowLeft") {
        setLeftPressed(true);
      } else if (e.key === " ") {
        if (!gameStarted && !gameOver) {
          setLevel(selectedLevel);
          setGameStarted(true);
        } else if (gameStarted) {
          // Check if any ball has no velocity (not launched)
          const hasUnlaunchedBall = balls.some(
            (ball) => ball.active && ball.dx === 0 && ball.dy === 0
          );

          if (hasUnlaunchedBall) {
            // Launch the ball when space is pressed during game
            setBalls((prevBalls) => {
              return prevBalls.map((ball) => {
                // Only add velocity to balls that have no velocity
                if (ball.active && ball.dx === 0 && ball.dy === 0) {
                  return {
                    ...ball,
                    dx: BASE_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
                    dy: -BASE_BALL_SPEED,
                  };
                }
                return ball;
              });
            });
          }
        }
      }
    },
    [gameStarted, gameOver, selectedLevel, balls]
  );

  // Handle key up event
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === "Right" || e.key === "ArrowRight") {
      setRightPressed(false);
    } else if (e.key === "Left" || e.key === "ArrowLeft") {
      setLeftPressed(false);
    }
  }, []);

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Load high score from localStorage
  useEffect(() => {
    const savedHighScore = localStorage.getItem("blockBreakerHighScore");
    if (savedHighScore) {
      setHighScore(parseInt(savedHighScore, 10));
    }
  }, []);

  // Initialize game
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasWidth = canvas.width;

    // Only initialize paddle position if it hasn't been set yet
    if (paddleX === 0) {
      setPaddleX((canvasWidth - PADDLE_WIDTH) / 2);
    }

    // Clear any existing paddle width timeout
    if (paddleWidthTimeoutId) {
      clearTimeout(paddleWidthTimeoutId);
      setPaddleWidthTimeoutId(null);
    }
  }, [canvasRef, paddleWidthTimeoutId, paddleX]);

  // Update high score when score changes
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem("blockBreakerHighScore", score.toString());
    }
  }, [score, highScore]);

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Draw and update all balls
      const newBalls = [...balls];

      // If ball has no velocity (not launched), make it follow the paddle
      for (let i = 0; i < newBalls.length; i++) {
        if (
          newBalls[i].active &&
          newBalls[i].dx === 0 &&
          newBalls[i].dy === 0
        ) {
          // ボールをパドルの中央に配置
          newBalls[i].x = paddleX + currentPaddleWidth / 2;
          newBalls[i].y = canvasHeight - PADDLE_HEIGHT - BALL_RADIUS;
        }
      }

      // Calculate total width of blocks and center offset
      const totalBlockWidth =
        (BLOCK_WIDTH + BLOCK_PADDING) * BLOCK_COLUMN_COUNT - BLOCK_PADDING;
      const offsetLeft = (canvasWidth - totalBlockWidth) / 2;

      // Draw blocks
      for (let c = 0; c < BLOCK_COLUMN_COUNT; c++) {
        for (let r = 0; r < BLOCK_ROW_COUNT; r++) {
          if (blocks[c]?.[r]?.status === 1) {
            const blockX = c * (BLOCK_WIDTH + BLOCK_PADDING) + offsetLeft;
            const blockY =
              r * (BLOCK_HEIGHT + BLOCK_PADDING) + BLOCK_OFFSET_TOP;
            blocks[c][r].x = blockX;
            blocks[c][r].y = blockY;

            ctx.beginPath();
            ctx.rect(blockX, blockY, BLOCK_WIDTH, BLOCK_HEIGHT);
            ctx.fillStyle = getBlockColor(r);
            ctx.fill();
            ctx.closePath();
          }
        }
      }

      // Draw paddle
      ctx.beginPath();
      ctx.rect(
        paddleX,
        canvasHeight - PADDLE_HEIGHT,
        currentPaddleWidth,
        PADDLE_HEIGHT
      );
      ctx.fillStyle = "#0095DD";
      ctx.fill();
      ctx.closePath();

      let activeBallCount = 0;

      // Draw items
      const newItems = [...items];
      for (let i = 0; i < newItems.length; i++) {
        if (newItems[i].active) {
          // Draw item
          ctx.beginPath();
          ctx.arc(newItems[i].x, newItems[i].y, ITEM_RADIUS, 0, Math.PI * 2);

          // Different colors for different item types
          if (newItems[i].type === ItemType.EXTRA_BALL) {
            ctx.fillStyle = "#FF5252"; // Red for extra ball
          } else {
            ctx.fillStyle = "#4CAF50"; // Green for wider paddle
          }

          ctx.fill();
          ctx.closePath();

          // Move item down
          newItems[i].y += ITEM_SPEED;

          // Check if item hit the paddle
          if (
            newItems[i].y >= canvasHeight - PADDLE_HEIGHT - ITEM_RADIUS &&
            newItems[i].y <= canvasHeight - PADDLE_HEIGHT + PADDLE_HEIGHT &&
            newItems[i].x >= paddleX &&
            newItems[i].x <= paddleX + currentPaddleWidth
          ) {
            // Apply item effect
            if (newItems[i].type === ItemType.EXTRA_BALL) {
              // Add an extra ball
              console.log("Extra ball item collected!");
              const newBall: Ball = {
                x: canvasWidth / 2,
                y: canvasHeight - PADDLE_HEIGHT - BALL_RADIUS,
                dx: BASE_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1), // Random direction
                dy: -BASE_BALL_SPEED,
                active: true,
              };
              newBalls.push(newBall);
              console.log("New balls count:", newBalls.length);
            } else if (newItems[i].type === ItemType.WIDER_PADDLE) {
              // Increment power-up count
              setPaddleWidthPowerUps((prev) => {
                const newCount = prev + 1;
                // Make paddle wider based on power-up count
                const newWidth =
                  PADDLE_WIDTH + PADDLE_WIDTH_INCREASE * newCount;
                console.log(
                  "Wider paddle item collected! New width:",
                  newWidth
                );

                // Immediately update paddle width
                setCurrentPaddleWidth(newWidth);

                // Reset paddle width after duration
                if (paddleWidthTimeoutId) {
                  clearTimeout(paddleWidthTimeoutId);
                }

                const timeoutId = setTimeout(() => {
                  console.log("Paddle width power-up expired!");
                  setPaddleWidthPowerUps((current) => {
                    const updatedCount = current - 1;
                    if (updatedCount > 0) {
                      // Still has active power-ups
                      setCurrentPaddleWidth(
                        PADDLE_WIDTH + PADDLE_WIDTH_INCREASE * updatedCount
                      );
                    } else {
                      // No more power-ups
                      setCurrentPaddleWidth(PADDLE_WIDTH);
                    }
                    return updatedCount;
                  });
                  setPaddleWidthTimeoutId(null);
                }, POWER_UP_DURATION);

                setPaddleWidthTimeoutId(timeoutId);
                return newCount;
              });
            }

            // Deactivate item
            newItems[i].active = false;
          }

          // Check if item is out of bounds
          if (newItems[i].y > canvasHeight) {
            newItems[i].active = false;
          }
        }
      }

      // Remove inactive items
      setItems(newItems.filter((item) => item.active));

      for (let i = 0; i < newBalls.length; i++) {
        const ball = newBalls[i];
        if (ball.active) {
          activeBallCount++;

          // Draw ball
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = "#0095DD";
          ctx.fill();
          ctx.closePath();

          // Collision detection with blocks
          let blockCollision = false;
          for (let c = 0; c < BLOCK_COLUMN_COUNT; c++) {
            for (let r = 0; r < BLOCK_ROW_COUNT; r++) {
              const b = blocks[c]?.[r];
              if (b?.status === 1) {
                if (
                  ball.x > b.x &&
                  ball.x < b.x + BLOCK_WIDTH &&
                  ball.y > b.y &&
                  ball.y < b.y + BLOCK_HEIGHT
                ) {
                  ball.dy = -ball.dy;
                  blockCollision = true;

                  const newBlocks = [...blocks];
                  newBlocks[c][r].status = 0;
                  setBlocks(newBlocks);
                  setScore((prevScore) => prevScore + 1);

                  // Randomly spawn an item
                  if (Math.random() < ITEM_DROP_CHANCE) {
                    const newItem: Item = {
                      x: b.x + BLOCK_WIDTH / 2,
                      y: b.y + BLOCK_HEIGHT / 2,
                      type:
                        Math.random() < 0.5
                          ? ItemType.EXTRA_BALL
                          : ItemType.WIDER_PADDLE,
                      active: true,
                    };
                    setItems((prevItems) => [...prevItems, newItem]);
                  }

                  // Check if all blocks are cleared
                  if (score + 1 === BLOCK_ROW_COUNT * BLOCK_COLUMN_COUNT) {
                    setGameCleared(true);
                    setGameStarted(false);
                    return;
                  }

                  break;
                }
              }
            }
            if (blockCollision) break;
          }

          // Collision detection with walls
          if (
            ball.x + ball.dx > canvasWidth - BALL_RADIUS ||
            ball.x + ball.dx < BALL_RADIUS
          ) {
            ball.dx = -ball.dx;
          }

          if (ball.y + ball.dy < BALL_RADIUS) {
            ball.dy = -ball.dy;
          } else if (
            ball.y + ball.dy >
            canvasHeight - BALL_RADIUS - PADDLE_HEIGHT
          ) {
            if (ball.x >= paddleX && ball.x <= paddleX + currentPaddleWidth) {
              // Ball hit the paddle
              ball.dy = -ball.dy;

              // Change ball direction based on where it hit the paddle
              const paddleCenter = paddleX + currentPaddleWidth / 2;
              const ballDistanceFromCenter = ball.x - paddleCenter;
              ball.dx = ballDistanceFromCenter * 0.15;
            } else if (ball.y + ball.dy > canvasHeight - BALL_RADIUS) {
              // Ball hit the bottom wall - deactivate this ball
              ball.active = false;
            }
          }

          // Calculate next position
          const nextX = ball.x + ball.dx;
          const nextY = ball.y + ball.dy;

          // Check for collisions before moving
          if (nextX > canvasWidth - BALL_RADIUS || nextX < BALL_RADIUS) {
            ball.dx = -ball.dx;
          }

          if (nextY < BALL_RADIUS) {
            ball.dy = -ball.dy;
          }

          // Move ball if it has velocity
          if (ball.dx !== 0 || ball.dy !== 0) {
            ball.x = nextX;
            ball.y = nextY;
          }
        }
      }

      // Update balls state with all active balls
      setBalls(newBalls.filter((ball) => ball.active));

      // Check if all balls are lost
      if (activeBallCount === 0) {
        setGameOver(true);
        setGameStarted(false);
      }

      // Move paddle
      if (rightPressed && paddleX < canvasWidth - currentPaddleWidth) {
        setPaddleX((prevX) => prevX + 10);
      } else if (leftPressed && paddleX > 0) {
        setPaddleX((prevX) => prevX - 10);
      }
    };

    const gameLoop = setInterval(draw, 10);
    return () => clearInterval(gameLoop);
  }, [
    gameStarted,
    gameOver,
    paddleX,
    currentPaddleWidth,
    rightPressed,
    leftPressed,
    blocks,
    balls,
    items,
    score,
    level,
    BLOCK_COLUMN_COUNT,
    BLOCK_ROW_COUNT,
    paddleWidthTimeoutId,
  ]);

  // Get color based on row
  const getBlockColor = (row: number) => {
    const colors = ["#FF5252", "#FF9800", "#FFEB3B", "#4CAF50", "#2196F3"];
    return colors[row % colors.length];
  };

  // Restart game
  const restartGame = () => {
    setScore(0);
    // ゲームオーバー時は現在のレベルを維持
    const restartLevel = gameOver ? level : selectedLevel;
    setLevel(restartLevel);
    setGameOver(false);
    setGameCleared(false);
    setGameStarted(false);
    setItems([]);

    // Reset power-ups and clear timeout
    setPaddleWidthPowerUps(0);
    if (paddleWidthTimeoutId) {
      clearTimeout(paddleWidthTimeoutId);
      setPaddleWidthTimeoutId(null);
    }

    // Reset blocks for selected level
    const newBlocks: Block[][] = [];
    const initialRowCount = Math.min(3 + Math.floor(restartLevel / 2), 8);
    const initialColumnCount = Math.min(5 + restartLevel, 12);
    for (let c = 0; c < initialColumnCount; c++) {
      newBlocks[c] = [];
      for (let r = 0; r < initialRowCount; r++) {
        newBlocks[c][r] = {
          x: 0,
          y: 0,
          status: 1,
        };
      }
    }
    setBlocks(newBlocks);

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Reset to a single ball on the paddle
    setBalls([
      {
        x: canvasWidth / 2,
        y: canvasHeight - PADDLE_HEIGHT - BALL_RADIUS,
        dx: 0,
        dy: 0,
        active: true,
      },
    ]);

    setPaddleX((canvasWidth - PADDLE_WIDTH) / 2);
  };

  // Next level
  const nextLevel = () => {
    const newLevel = level + 1;
    setLevel(newLevel);
    setGameCleared(false);
    setGameStarted(false);
    setItems([]);

    // Reset power-ups and clear timeout
    setPaddleWidthPowerUps(0);
    if (paddleWidthTimeoutId) {
      clearTimeout(paddleWidthTimeoutId);
      setPaddleWidthTimeoutId(null);
    }

    // Reset blocks for the new level
    const newBlocks: Block[][] = [];
    const newRowCount = Math.min(3 + Math.floor(newLevel / 2), 8);
    const newColumnCount = Math.min(5 + newLevel, 12);
    for (let c = 0; c < newColumnCount; c++) {
      newBlocks[c] = [];
      for (let r = 0; r < newRowCount; r++) {
        newBlocks[c][r] = {
          x: 0,
          y: 0,
          status: 1,
        };
      }
    }
    setBlocks(newBlocks);

    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Reset to a single ball on the paddle with increased speed potential
    setBalls([
      {
        x: canvasWidth / 2,
        y: canvasHeight - PADDLE_HEIGHT - BALL_RADIUS,
        dx: 0,
        dy: 0,
        active: true,
      },
    ]);

    setPaddleX((canvasWidth - PADDLE_WIDTH) / 2);
  };

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameInfo}>
        <div className={styles.score}>スコア: {score}</div>
        <div className={styles.highScore}>ハイスコア: {highScore}</div>
        <div className={styles.level}>レベル: {level}</div>
        <div className={styles.ballCount}>
          ボール数: {balls.filter((b) => b.active).length}
        </div>
        <div className={styles.powerUpCount}>
          パワーアップ: {paddleWidthPowerUps}
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className={styles.gameCanvas}
        width={800}
        height={500}
      />

      {!gameStarted && !gameOver && !gameCleared && (
        <div className={styles.startScreen}>
          <h2>ブロック崩し</h2>
          <div className={styles.levelSelector}>
            <p>レベルを選択:</p>
            <div className={styles.levelButtons}>
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  className={`${styles.levelButton} ${
                    selectedLevel === lvl ? styles.selectedLevel : ""
                  }`}
                  onClick={() => setSelectedLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <button
            className={styles.startButton}
            onClick={() => {
              setLevel(selectedLevel);
              setGameStarted(true);
            }}
          >
            ゲームスタート
          </button>
          <p>または SPACE キーを押してスタート</p>
          <p>左右の矢印キーでパドルを操作</p>
          <p>パドルを移動してボールの位置を決め、SPACE キーで発射</p>
        </div>
      )}

      {gameOver && (
        <div className={styles.gameOverScreen}>
          <h2>ゲームオーバー</h2>
          <p>スコア: {score}</p>
          <p>ハイスコア: {highScore}</p>
          <p>レベル: {level}</p>
          <button className={styles.restartButton} onClick={restartGame}>
            もう一度プレイ
          </button>
        </div>
      )}

      {gameCleared && (
        <div className={styles.gameClearedScreen}>
          <h2>レベルクリア!</h2>
          <p>スコア: {score}</p>
          <p>ハイスコア: {highScore}</p>
          <p>レベル: {level}</p>
          <div className={styles.levelSelector}>
            <p>次のレベルを選択:</p>
            <div className={styles.levelButtons}>
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  className={`${styles.levelButton} ${
                    selectedLevel === lvl ? styles.selectedLevel : ""
                  }`}
                  onClick={() => setSelectedLevel(lvl)}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.buttonContainer}>
            <button className={styles.nextLevelButton} onClick={nextLevel}>
              次のレベル
            </button>
            <button className={styles.restartButton} onClick={restartGame}>
              リスタート
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
