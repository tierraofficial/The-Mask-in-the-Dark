import { GAME_SETTINGS } from './Config.js';

/**
 * TurnSystem - 管理回合计时、回合解析和AP系统
 */
export class TurnSystem {
    constructor(gameManager) {
        this.gameManager = gameManager;

        // Turn state
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;
        this.turnCount = 0;
        this.lastTime = 0;
    }

    /**
     * 游戏主循环
     */
    loop(timestamp) {
        const gm = this.gameManager;

        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (!gm.gameOver && !gm.isPaused) {
            // STRICT TIMER: Always counts down
            this.timeLeft -= deltaTime;

            if (this.timeLeft <= 0) {
                this.resolveTurn();
            }
        }

        gm.draw();
        gm.reqId = requestAnimationFrame((ts) => this.loop(ts));
    }

    /**
     * 回合结算（时间耗尽时调用）
     */
    resolveTurn() {
        const gm = this.gameManager;

        console.log("Turn Time Up. Resolving...");

        // 1. Spirit Act (Priority: Spirit moves first)
        gm.turn = 'SPIRIT';

        const result = gm.spirit.act(gm.player, gm.gridSystem);

        // Spirit Collision Check
        if (gm.checkGameState()) return;

        // Spirit Special Actions
        this.handleSpiritAction(result);

        // Check Environment
        if (gm.checkGameState()) return;

        // Spirit Burn Check
        if (gm.gridSystem.isSafe(gm.spirit.x, gm.spirit.y)) {
            gm.spirit.hp--;
            // TRIGGER VISUAL EFFECT
            if (gm.renderer) {
                gm.renderer.triggerDamageEffect(gm.spirit.x, gm.spirit.y);
            }

            if (gm.spirit.hp <= 0) {
                gm.endGame(true, "DEMON BANISHED");
                return;
            } else {
                gm.placeSpirit();
                if (gm.checkGameState()) return;
            }
        }

        // Check Void
        if (gm.checkGameState()) return;

        // 2. Idle Penalty (Check AP usage AFTER spirit move)
        // This ensures the spirit doesn't get a 'free kill' on a tile that JUST went dark
        if (this.currentAP === GAME_SETTINGS.PLAYER_AP) {
            console.log("IDLE PENALTY TRIGGERED!");
            for (let i = 0; i < GAME_SETTINGS.IDLE_PENALTY_LIGHTS; i++) {
                gm.gridSystem.corruptRandomLight();
            }
            if (gm.checkGameState()) return;
        }

        // 3. Start Next Turn
        this.startNextTurn();
    }

    /**
     * 处理恶灵行为结果
     */
    handleSpiritAction(result) {
        const gm = this.gameManager;

        if (result && result.action === 'STUCK') {
            const target = gm.gridSystem.corruptRandomLight();
            if (target && gm.renderer) gm.renderer.triggerWarning(target.x, target.y);
        }
        else if (result && result.action === 'CORRUPT') {
            gm.gridSystem.corruptLightAt(result.target.x, result.target.y);
            if (gm.renderer) gm.renderer.triggerWarning(result.target.x, result.target.y);
        }
    }

    /**
     * 开始下一回合
     */
    startNextTurn() {
        const gm = this.gameManager;

        this.turnCount++; // Increment survival counter
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;
        gm.turn = 'PLAYER';
        gm.abilitySystem.scanUsedThisTurn = false; // Reset SCAN availability

        gm.uiManager.updateScore(gm.gridSystem.lightCount);
        gm.uiManager.updateRound(this.turnCount);

        // Update SCAN button state
        gm.abilitySystem.updateScanButtonState();

        gm.checkDanger();

        // Check new victory condition: Survive SPIRIT_HP * 8 turns
        const victoryTurns = GAME_SETTINGS.SPIRIT_HP * 8;
        if (this.turnCount >= victoryTurns) {
            gm.endGame(true, `SURVIVED ${victoryTurns} TURNS!`);
            return;
        }
    }

    /**
     * 重置回合系统
     */
    reset() {
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;
        this.turnCount = 0;
        this.lastTime = 0;
    }
}
