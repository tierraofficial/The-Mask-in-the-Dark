import { GridSystem } from './GridSystem.js';
import { Player, Spirit } from './Entity.js';
import { GRID_SIZE, GAME_SETTINGS } from './Config.js';
import { UIManager } from './UIManager.js';

export class GameManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.uiManager = new UIManager();
        this.gridSystem = new GridSystem();
        this.player = new Player(GAME_SETTINGS.PLAYER_START.x, GAME_SETTINGS.PLAYER_START.y);
        this.spirit = new Spirit(0, 0);

        this.turn = 'PLAYER'; // PLAYER -> SPIRIT -> RESOLVE
        this.gameOver = false;

        // Timer & AP System
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;

        this.lastTime = 0;
        this.isPaused = false;

        // Bind keyboard
        window.addEventListener('keydown', (e) => this.handleInput(e.key));

        // Bind HTML Buttons
        document.querySelectorAll('.d-pad div, .round-btn, .pill-btn, .big-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                if (key) this.handleInput(key);
            });
        });
    }

    init() {
        this.gridSystem.init();
        this.player.x = GAME_SETTINGS.PLAYER_START.x;
        this.player.y = GAME_SETTINGS.PLAYER_START.y;
        this.placeSpirit();

        // Reset State
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;

        this.uiManager.updateAP(this.currentAP);
        this.checkDanger();

        this.revealCount = 0;
        this.turn = 'PLAYER';

        // Reset UI Label
        const btnLabel = document.querySelector('.btn-wrapper .label');
        if (btnLabel) btnLabel.innerText = "SCAN (3)";

        // Start Animation Loop
        requestAnimationFrame((ts) => this.loop(ts));

        console.log("Game Initialized (Strict Turn Mode)");
    }

    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (!this.gameOver && !this.isPaused) {
            // STRICT TIMER: Always counts down
            this.timeLeft -= deltaTime;

            if (this.timeLeft <= 0) {
                this.resolveTurn();
            }
        }

        this.draw();
        requestAnimationFrame((ts) => this.loop(ts));
    }


    placeSpirit() {
        let attempts = 0;
        let sx, sy;
        do {
            sx = Math.floor(Math.random() * GRID_SIZE);
            sy = Math.floor(Math.random() * GRID_SIZE);
            attempts++;
        } while (
            (Math.abs(sx - this.player.x) + Math.abs(sy - this.player.y) < 3 || this.gridSystem.isSafe(sx, sy))
            && attempts < GAME_SETTINGS.SPAWN_ATTEMPTS
        );

        if (attempts >= GAME_SETTINGS.SPAWN_ATTEMPTS) { sx = 0; sy = 0; }

        this.spirit.x = sx;
        this.spirit.y = sy;
    }

    handleInput(key) {
        if (this.gameOver || this.isPaused) return;

        // GLOBAL INPUTS (Always allowed)
        if (key === 'Reveal') {
            this.triggerReveal();
            return;
        }

        // Force Reveal(Debug Only)
        if (key === 'f' || key === 'F') {
            this.forceReaval();
            return;
        }


        // Strict Turn: Only allow input if it's PLAYER turn AND we have AP
        if (this.turn !== 'PLAYER' || this.currentAP <= 0) return;

        let dx = 0;
        let dy = 0;

        switch (key) {
            case 'w': case 'ArrowUp': dy = -1; break;
            case 's': case 'ArrowDown': dy = 1; break;
            case 'a': case 'ArrowLeft': dx = -1; break;
            case 'd': case 'ArrowRight': dx = 1; break;
            case ' ': case 'Space': break; // Wait
            case 'r': this.reset(); return;
            case 'Enter': case 'Start': return;
            default: return;
        }

        const targetX = this.player.x + dx;
        const targetY = this.player.y + dy;

        if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE) {
            // 1. Apply Move
            this.player.move(dx, dy);

            // 2. Decrement AP
            this.currentAP--;
            this.uiManager.updateAP(this.currentAP);

            // 3. Immediate Check
            if (this.checkGameState()) return;

            // 4. Interaction (Flip Lights)
            this.gridSystem.flip(targetX, targetY);

            // 5. Check Environment
            if (this.checkGameState()) return;

            // 6. WAIT FOR TIMER (No Spirit Turn here)
            console.log(`Action Taken. AP: ${this.currentAP}`);
        }
    }

    triggerReveal() {
        if (this.revealCount >= GAME_SETTINGS.SPIRIT_REVEAL_LIMIT) return;
        if (this.spirit.visible) return; // Already visible

        console.log("SCANNING...");
        this.revealCount++;
        this.spirit.visible = true;

        // Update Button UI
        const btnLabel = document.querySelector('.btn-wrapper .label');
        if (btnLabel) btnLabel.innerText = `SCAN (${GAME_SETTINGS.SPIRIT_REVEAL_LIMIT - this.revealCount})`;

        // Auto Hide
        setTimeout(() => {
            if (!this.gameOver) {
                this.spirit.visible = false;
            }
        }, GAME_SETTINGS.SPIRIT_REVEAL_DURATION);
    }

    forceReaval() {
        if (this.spirit.visible) return; // Already visible

        this.spirit.visible = true;
        // Auto Hide
        setTimeout(() => {
            if (!this.gameOver) {
                this.spirit.visible = false;
            }
        }, GAME_SETTINGS.SPIRIT_REVEAL_DURATION);
    }

    reset() {
        this.gameOver = false;
        this.spirit.hp = GAME_SETTINGS.SPIRIT_HP;
        this.init();
    }

    // Called when Time runs out (5s -> 0s)
    resolveTurn() {
        console.log("Turn Time Up. Resolving...");

        // 1. Check Idle Penalty (Did player use AP?)
        if (this.currentAP === GAME_SETTINGS.PLAYER_AP) {
            console.log("IDLE PENALTY TRIGGERED!");
            for (let i = 0; i < GAME_SETTINGS.IDLE_PENALTY_LIGHTS; i++) {
                this.gridSystem.corruptRandomLight();
            }
            if (this.checkGameState()) return;
        }

        // 2. Spirit Act
        this.turn = 'SPIRIT';

        const result = this.spirit.act(this.player, this.gridSystem);

        // Spirit Collision Check
        if (this.checkGameState()) return;

        // Spirit Special Actions
        if (result && result.action === 'STUCK') {
            this.gridSystem.corruptRandomLight();
        }
        else if (result && result.action === 'CORRUPT') {
            this.gridSystem.corruptLightAt(result.target.x, result.target.y);
        }

        // Check Environment
        if (this.checkGameState()) return;

        // Spirit Burn Check
        if (this.gridSystem.isSafe(this.spirit.x, this.spirit.y)) {
            this.spirit.hp--;
            if (this.spirit.hp <= 0) {
                this.endGame(true, "DEMON BANISHED");
                return;
            } else {
                this.placeSpirit();
                if (this.checkGameState()) return;
            }
        }

        // Check Void
        if (this.checkGameState()) return;

        // 3. Start Next Turn
        this.startNextTurn();
    }

    startNextTurn() {
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;
        this.turn = 'PLAYER';

        this.uiManager.updateScore(this.gridSystem.lightCount);
        this.uiManager.updateAP(this.currentAP);

        this.checkDanger();
    }

    checkDanger() {
        const dist = Math.abs(this.player.x - this.spirit.x) + Math.abs(this.player.y - this.spirit.y);
        if (dist <= 1 && this.spirit.hp > 0) {
            this.uiManager.updateStatus("DANGER", true);
        } else {
            this.uiManager.updateStatus("SAFE", false);
        }
    }

    // Centralized State Checker
    // Returns TRUE if game ended
    checkGameState() {
        // Priority 1: Caught (Instant Loss)
        if (this.player.x === this.spirit.x && this.player.y === this.spirit.y) {
            this.endGame(false, "CAUGHT BY THE DARKNESS");
            return true;
        }

        // Priority 2: No Lights (Instant Loss)
        if (this.gridSystem.lightCount === 0) {
            this.endGame(false, "LOST IN DARKNESS");
            return true;
        }

        return false;
    }

    endGame(win, msg) {
        if (this.gameOver) return; // Prevent double trigger
        this.gameOver = true;
        this.turn = 'GAMEOVER';

        // Force Reveal on Game Over
        this.spirit.visible = true;

        this.renderer.draw(this.gridSystem, this.player, this.spirit, 0);
        this.uiManager.showGameOver(msg, win);
    }

    updateEnvironment() {
        const isSafe = this.gridSystem.isSafe(this.player.x, this.player.y);
        this.uiManager.updateAmbience(isSafe);
    }

    draw() {
        this.updateEnvironment(); // Check environment every frame or update? 
        // Better to put it in update/loop, but draw is called in loop.
        // Putting it here ensures visual sync.

        this.renderer.draw(this.gridSystem, this.player, this.spirit, this.timeLeft);
    }
}
