import { GAME_SETTINGS } from './Config.js';

/**
 * AbilitySystem - 管理玩家技能（SCAN等）
 */
export class AbilitySystem {
    constructor(gameManager) {
        this.gameManager = gameManager;

        // SCAN ability state
        this.revealCount = 0;
        this.scanUsedThisTurn = false;
    }

    /**
     * 触发 SCAN 技能
     */
    triggerReveal() {
        const gm = this.gameManager;

        if (this.revealCount >= GAME_SETTINGS.SPIRIT_REVEAL_LIMIT) return;
        if (gm.spirit.visible) return; // Already visible
        if (this.scanUsedThisTurn) return; // Already used this turn

        console.log("SCANNING...");
        this.revealCount++;
        gm.spirit.visible = true;
        this.scanUsedThisTurn = true;

        // Update button visual state
        this.updateScanButtonState();

        // Fix: Force complete current animation before new movement
        // This ensures spirit always moves from grid positions, not mid-animation
        if (gm.renderer) {
            gm.renderer.spiritAnimX = gm.renderer.spiritTargetX;
            gm.renderer.spiritAnimY = gm.renderer.spiritTargetY;
        }

        // Spirit reacts to SCAN by moving immediately
        const result = gm.spirit.act(gm.player, gm.gridSystem);

        // Handle spirit actions (similar to resolveTurn logic)
        gm.turnSystem.handleSpiritAction(result);

        // Check if spirit caught player during SCAN movement
        if (gm.checkGameState()) return;

        // Update Button UI
        const btnLabel = document.querySelector('.btn-wrapper .label');
        if (btnLabel) btnLabel.innerText = `SCAN (${GAME_SETTINGS.SPIRIT_REVEAL_LIMIT - this.revealCount})`;

        // Auto Hide
        setTimeout(() => {
            if (!gm.gameOver) {
                gm.spirit.visible = false;
            }
        }, GAME_SETTINGS.SPIRIT_REVEAL_DURATION);
    }

    /**
     * 更新 SCAN 按钮视觉状态
     */
    updateScanButtonState() {
        const scanBtn = document.querySelector('.big-btn');
        if (scanBtn) {
            if (this.scanUsedThisTurn || this.revealCount >= GAME_SETTINGS.SPIRIT_REVEAL_LIMIT) {
                scanBtn.classList.add('disabled');
            } else {
                scanBtn.classList.remove('disabled');
            }
        }
    }

    /**
     * 检查是否可以使用 SCAN
     */
    canUseScan() {
        return !this.scanUsedThisTurn &&
            this.revealCount < GAME_SETTINGS.SPIRIT_REVEAL_LIMIT &&
            !this.gameManager.spirit.visible;
    }

    /**
     * 重置技能系统
     */
    reset() {
        this.revealCount = 0;
        this.scanUsedThisTurn = false;

        // Reset UI Label
        const btnLabel = document.querySelector('.btn-wrapper .label');
        if (btnLabel) btnLabel.innerText = "SCAN (3)";

        this.updateScanButtonState();
    }
}
