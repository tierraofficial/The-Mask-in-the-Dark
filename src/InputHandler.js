import { GRID_SIZE } from './Config.js';

/**
 * InputHandler - 处理所有用户输入
 * 负责键盘、按钮事件绑定和玩家移动逻辑
 */
export class InputHandler {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.keydownHandler = null;
        this.buttonHandlers = [];
    }

    /**
     * 绑定键盘和按钮事件
     */
    bindEvents() {
        // 绑定键盘事件
        this.keydownHandler = (e) => this.handleInput(e.key);
        window.addEventListener('keydown', this.keydownHandler);

        // 绑定HTML按钮事件
        const buttons = document.querySelectorAll('.d-pad div, .round-btn, .pill-btn, .big-btn');
        buttons.forEach(btn => {
            const handler = () => {
                const key = btn.dataset.key;
                if (key) this.handleInput(key);
            };
            btn.addEventListener('click', handler);
            this.buttonHandlers.push({ element: btn, handler });
        });
    }

    /**
     * 解绑所有事件（用于清理）
     */
    unbindEvents() {
        if (this.keydownHandler) {
            window.removeEventListener('keydown', this.keydownHandler);
            this.keydownHandler = null;
        }

        this.buttonHandlers.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        this.buttonHandlers = [];
    }

    /**
     * 处理输入（键盘/按钮）
     */
    handleInput(key) {
        const gm = this.gameManager;

        if (gm.gameOver || gm.isPaused) return;

        // GLOBAL INPUTS (Always allowed)
        if (key === 'Reveal') {
            gm.abilitySystem.triggerReveal();
            return;
        }

        // Reveal (Consume Scan count)
        if (key === 'f' || key === 'F') {
            gm.abilitySystem.triggerReveal();
            return;
        }

        // If Raycaster is active, IGNORE WASD for 2D movement to avoid conflicts!
        // We only allow 'r' (Reset) or maybe 'Space' (Wait)
        if (gm.raycaster) {
            if (key === 'r') { gm.reset(); return; }
            // Allow 'Space' to skip turn?
            if (key === ' ' || key === 'Space') {
                // Wait implementation? 
            }
            return;
        }

        // ... Old 2D Input Fallback (for debugging purely 2D mode) ...

        // Strict Turn: Only allow input if it's PLAYER turn AND we have AP
        if (gm.turn !== 'PLAYER' || gm.turnSystem.currentAP <= 0) return;

        let dx = 0;
        let dy = 0;

        switch (key) {
            case 'w': case 'ArrowUp': dy = -1; break;
            case 's': case 'ArrowDown': dy = 1; break;
            case 'a': case 'ArrowLeft': dx = -1; break;
            case 'd': case 'ArrowRight': dx = 1; break;
            case ' ': case 'Space': break; // Wait
            case 'r': gm.reset(); return;
            case 'Enter': case 'Start': return;
            default: return;
        }

        if (dx !== 0 || dy !== 0) {
            this.handlePlayerMove(dx, dy);
        }
    }

    /**
     * 处理玩家移动逻辑
     */
    handlePlayerMove(dx, dy) {
        const gm = this.gameManager;

        if (gm.gameOver || gm.isPaused) return;
        if (gm.turn !== 'PLAYER') return;

        const targetX = gm.player.x + dx;
        const targetY = gm.player.y + dy;

        if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
            // 1. Apply Move
            gm.player.move(dx, dy);

            // 2. Decrement AP
            gm.turnSystem.currentAP--;

            // 3. Immediate Check
            if (gm.checkGameState()) return;

            // 4. Interaction (Flip Lights)
            gm.gridSystem.flip(targetX, targetY);

            // 5. Check Environment
            if (gm.checkGameState()) return;

            // 6. Update Danger Status (immediately after moving to new room)
            gm.checkDanger();

            // 7. WAIT FOR TIMER (No Spirit Turn here)
            console.log(`Action Taken. AP: ${gm.turnSystem.currentAP}`);
        }
    }
}
