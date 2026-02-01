/**
 * ScreenManager - 管理游戏的五个界面层
 * 界面流程: Start → Tutorial → Game → GameOverVideo → GameOverStats
 */
export class ScreenManager {
    constructor(renderer, uiManager) {
        this.renderer = renderer;
        this.uiManager = uiManager;
        this.currentScreen = 'start'; // 当前显示的界面
        this.gameManager = null;
        this.turnCount = 0; // 生存回合数
        this.isWin = false; // 游戏是否赢了

        // 获取DOM元素
        this.startScreenEl = document.getElementById('start-screen');
        this.tutorialScreenEl = document.getElementById('tutorial-screen');
        this.gameScreenEl = document.getElementById('game-screen');
        this.gameOverVideoScreenEl = document.getElementById('gameover-video-screen');
        this.victoryScreenEl = document.getElementById('victory-screen');
        this.gameOverStatsScreenEl = document.getElementById('gameover-stats-screen');
        this.gameOverVideoEl = document.getElementById('gameover-video');

        // 绑定事件监听
        this._bindEventListeners();
    }

    _bindEventListeners() {
        // 开始界面：点击任意位置进入教程
        if (this.startScreenEl) {
            this.startScreenEl.addEventListener('click', () => {
                this.showTutorialScreen();
            });
        }

        // 教程界面：点击按钮进入游戏
        const startGameBtn = document.getElementById('start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Attempt Fullscreen & Orientation Lock (Mobile)
                try {
                    if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                    } else if (document.documentElement.webkitRequestFullscreen) {
                        await document.documentElement.webkitRequestFullscreen();
                    }

                    if (screen.orientation && screen.orientation.lock) {
                        await screen.orientation.lock('landscape').catch(err => console.warn("Lock failed:", err));
                    }
                } catch (err) {
                    console.warn("Fullscreen/Orientation failed:", err);
                }

                this.showGameScreen();
            });
        }

        // 视频播放完成：显示统计界面
        if (this.gameOverVideoEl) {
            this.gameOverVideoEl.addEventListener('ended', () => {
                this._onVideoEnded();
            });
        }

        // 胜利界面：点击任意位置进入统计
        if (this.victoryScreenEl) {
            this.victoryScreenEl.addEventListener('click', () => {
                this._onVideoEnded(); // Re-use stats transition
            });
        }

        // 结算界面：重新开始按钮
        const restartBtn = document.getElementById('restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => {
                this.reset();
            });
        }

        // 结算界面：回到开始按钮
        const backToStartBtn = document.getElementById('back-to-start-btn');
        if (backToStartBtn) {
            backToStartBtn.addEventListener('click', () => {
                this.reset();
            });
        }
    }

    /**
     * 显示开始界面
     */
    showStartScreen() {
        this._hideAllScreens();
        if (this.startScreenEl) {
            this.startScreenEl.classList.add('active');
        }
        this.currentScreen = 'start';
        console.log("Screen: START");
    }

    /**
     * 显示教程界面
     */
    showTutorialScreen() {
        this._hideAllScreens();
        if (this.tutorialScreenEl) {
            this.tutorialScreenEl.classList.add('active');
        }
        this.currentScreen = 'tutorial';
        console.log("Screen: TUTORIAL");
    }

    /**
     * 显示游戏界面并初始化GameManager
     */
    showGameScreen() {
        this._hideAllScreens();
        if (this.gameScreenEl) {
            this.gameScreenEl.classList.add('active');
        }
        this.currentScreen = 'game';

        // 导入GameManager（动态导入，避免循环依赖）
        if (!this.gameManager) {
            // GameManager将在main.js中传入
            console.log("Waiting for GameManager initialization...");
        } else {
            // 确保游戏开始/重置
            if (this.gameManager.gameOver) {
                this.gameManager.reset();
            }
        }

        console.log("Screen: GAME");
    }

    /**
     * 设置GameManager引用（由main.js调用）
     */
    setGameManager(gameManager) {
        this.gameManager = gameManager;
    }

    /**
     * 显示游戏结束视频界面
     */
    showGameOverVideo(turnCount, isWin) {
        this._hideAllScreens();

        this.turnCount = turnCount;
        this.isWin = isWin;
        console.log(`Screen: GAMEOVER (Turns: ${turnCount}, Win: ${isWin})`);

        if (isWin) {
            // Show Victory Image
            if (this.victoryScreenEl) {
                this.victoryScreenEl.classList.add('active');
                this.currentScreen = 'victory';
                // Optional: Auto-advance after N seconds OR just wait for click
                // setTimeout(() => this._onVideoEnded(), 5000); 
            } else {
                this._onVideoEnded(); // Fallback
            }
        } else {
            // Show Game Over Video
            if (this.gameOverVideoScreenEl) {
                this.gameOverVideoScreenEl.classList.add('active');
            }
            this.currentScreen = 'gameover-video';

            // 重置视频并播放
            if (this.gameOverVideoEl) {
                this.gameOverVideoEl.currentTime = 0;
                this.gameOverVideoEl.play().catch(e => {
                    console.warn("Auto-play blocked, skipping directly to stats", e);
                    this._onVideoEnded();
                });
            }
        }
    }

    /**
     * 视频播放完成后显示统计界面
     */
    _onVideoEnded() {
        this._hideAllScreens();
        if (this.gameOverStatsScreenEl) {
            this.gameOverStatsScreenEl.classList.add('active');
        }
        this.currentScreen = 'gameover-stats';

        // 更新统计信息
        this._updateGameOverStats();

        console.log("Screen: GAMEOVER STATS");
    }

    /**
     * 更新游戏结束统计信息
     */
    _updateGameOverStats() {
        const turnCountEl = document.getElementById('gameover-turn-count');
        const resultEl = document.getElementById('gameover-result');

        if (turnCountEl) {
            const highScore = parseInt(localStorage.getItem('survival_record') || '0', 10);
            turnCountEl.innerHTML = `Survival: ${this.turnCount}<br><span style="font-size:0.8em;opacity:0.7">Record: ${highScore}</span>`;
        }

        if (resultEl) {
            if (this.isWin) {
                resultEl.innerText = '🎉 Exorcised the evil spirit!';
                resultEl.style.color = '#fffacd';
            } else {
                resultEl.innerText = 'Fell into darkness...';
                resultEl.style.color = '#ff4444';
            }
        }
    }

    /**
     * 重置到开始界面（用于重新开始或回到开始）
     */
    reset() {
        // 清理游戏状态
        if (this.gameManager) {
            this.gameManager.gameOver = true; // 标记游戏结束，停止游戏循环
            // 重新初始化会在 showGameScreen -> gameManager.reset() 时发生
        }

        // 重置计数
        this.turnCount = 0;
        this.isWin = false;

        // 返回开始界面
        this.showStartScreen();
    }

    /**
     * 隐藏所有界面
     */
    _hideAllScreens() {
        const screens = [
            this.startScreenEl,
            this.tutorialScreenEl,
            this.gameScreenEl,
            this.gameOverVideoScreenEl,
            this.victoryScreenEl,
            this.gameOverStatsScreenEl
        ];

        screens.forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });

        // Pause video if hiding
        if (this.gameOverVideoEl) {
            this.gameOverVideoEl.pause();
        }
    }

    /**
     * 初始化ScreenManager（显示开始界面）
     */
    init() {
        this.showStartScreen();
        console.log("ScreenManager Initialized");
    }
}
