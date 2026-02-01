import { GridSystem } from './GridSystem.js';
import { Player, Spirit } from './Entity.js';
import { GRID_SIZE, GAME_SETTINGS } from './Config.js';
import { UIManager } from './UIManager.js';

export class GameManager {
    constructor(renderer, audioManager) {
        this.renderer = renderer;
        this.audioManager = audioManager;
        this.uiManager = new UIManager();
        this.gridSystem = new GridSystem();
        this.player = new Player(GAME_SETTINGS.PLAYER_START.x, GAME_SETTINGS.PLAYER_START.y);
        this.spirit = new Spirit(0, 0);

        this.turn = 'PLAYER'; // PLAYER -> SPIRIT -> RESOLVE
        this.gameOver = false;
        this.wasDanger = false;

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

        // Audio
        if (this.audioManager) {
            this.audioManager.stopAll(); // Safety reset
            this.audioManager.playBgm();
        }

        // Reset State
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;
        this.wasDanger = false;

        this.uiManager.updateAP(this.currentAP);
        this.checkDanger();

        this.revealCount = 0;
        this.turnCount = 0;
        this.turn = 'PLAYER';
        this.spirit.visible = false; // Reset Visibility on Restart

        // Reset UI Label
        const btnLabel = document.querySelector('.btn-wrapper .label');
        if (btnLabel) btnLabel.innerText = "SCAN (3)";

        // Force Raycaster Re-init (Rebuild Map/Textures)
        if (this.raycaster) {
            // We need to re-run initMap mostly, but init() does it all.
            // Careful not to double-bind listeners, but Raycaster.init handles that?
            // Actually Raycaster.init binds listeners every time. That's bad.
            // Let's create a reInitMap method in Raycaster or just call initMap.
            // For now, let's look at Raycaster.js. 
            // Raycaster.init calls initMap. 
            // Let's assume Raycaster needs a hard reset method.
            // For this step, I'll just trigger map update.
            this.raycaster.initMap(this.gridSystem);

            // Reset Player Position in Raycaster to match new Grid
            const startX = GAME_SETTINGS.PLAYER_START.x;
            const startY = GAME_SETTINGS.PLAYER_START.y;
            this.raycaster.player.x = this.raycaster.GRID_OFFSET + startX * this.raycaster.CELL_SIZE + this.raycaster.CELL_SIZE / 2.0;
            this.raycaster.player.y = this.raycaster.GRID_OFFSET + startY * this.raycaster.CELL_SIZE + this.raycaster.CELL_SIZE / 2.0;
        }

        // Start Animation Loop
        this.reqId = requestAnimationFrame((ts) => this.loop(ts));

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
        this.reqId = requestAnimationFrame((ts) => this.loop(ts));
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

    setRaycaster(raycaster) {
        this.raycaster = raycaster;
        // Inject Audio Manager to Raycaster here
        if (this.audioManager) {
            this.raycaster.setAudioManager(this.audioManager);
        }

        // Initial sync
        this.raycaster.updateLightMap(this.gridSystem);

        // Bind Callback: 3D Movement -> 2D Logic
        this.raycaster.onPlayerMove = (dx, dy) => {
            console.log(`3D Move Detected: ${dx}, ${dy}`);
            // Simulate "Input" for movement
            this.handlePlayerMove(dx, dy);
        };
    }

    // Separated logic for movement execution
    handlePlayerMove(dx, dy) {
        if (this.gameOver || this.isPaused) return;
        if (this.turn !== 'PLAYER') return;

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

    handleInput(key) {
        if (this.gameOver || this.isPaused) return;

        // GLOBAL INPUTS (Always allowed)
        if (key === 'Reveal') {
            this.triggerReveal();
            return;
        }

        // Reveal (Consume Scan count)
        if (key === 'f' || key === 'F') {
            this.triggerReveal();
            return;
        }

        // If Raycaster is active, IGNORE WASD for 2D movement to avoid conflicts!
        // We only allow 'r' (Reset) or maybe 'Space' (Wait)
        if (this.raycaster) {
            if (key === 'r') { this.reset(); return; }
            // Allow 'Space' to skip turn?
            if (key === ' ' || key === 'Space') {
                // Wait implementation? 
            }
            return;
        }

        // ... Old 2D Input Fallback (for debugging purely 2D mode) ...

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

        if (dx !== 0 || dy !== 0) {
            this.handlePlayerMove(dx, dy);
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



    reset() {
        // Stop previous loop to prevent duplication
        if (this.reqId) {
            cancelAnimationFrame(this.reqId);
            this.reqId = null;
        }

        this.gameOver = false;
        this.isPaused = false;
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
        this.turnCount++; // Increment survival counter
        this.timeLeft = GAME_SETTINGS.TURN_TIME_LIMIT;
        this.currentAP = GAME_SETTINGS.PLAYER_AP;
        this.turn = 'PLAYER';

        this.uiManager.updateScore(this.gridSystem.lightCount);
        this.uiManager.updateAP(this.currentAP);

        this.checkDanger();
    }

    checkDanger() {
        const dist = Math.abs(this.player.x - this.spirit.x) + Math.abs(this.player.y - this.spirit.y);
        const isDanger = (dist <= 1 && this.spirit.hp > 0);

        if (isDanger) {
            this.uiManager.updateStatus("DANGER", true);
            // Play Audio if newly entering danger
            if (!this.wasDanger && this.audioManager) {
                this.audioManager.playAlert();
            }
        } else {
            this.uiManager.updateStatus("SAFE", false);
        }

        this.wasDanger = isDanger;
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

    setScreenManager(screenManager) {
        this.screenManager = screenManager;
    }

    endGame(win, msg) {
        if (this.gameOver) return; // Prevent double trigger

        // --- Victory Condition Check: Survival Record ---
        // Get previous record
        let highScore = 0;
        try {
            highScore = parseInt(localStorage.getItem('survival_record') || '0', 10);
        } catch (e) {
            console.warn("Storage access failed", e);
        }

        let isMercy = false;
        // If we survived longer than a non-zero record, the Spirit grants mercy
        if (this.turnCount > highScore && highScore > 0) {
            if (!win) {
                isMercy = true;
                win = true; // Override to WIN
                msg = "NEW RECORD! MERCY GRANTED";
            }
        }

        // Update Record if beaten
        if (this.turnCount > highScore) {
            try {
                localStorage.setItem('survival_record', this.turnCount);
                console.log(`New Record Set: ${this.turnCount}`);
            } catch (e) { }
        }
        // ------------------------------------------------

        this.gameOver = true;
        this.turn = 'GAMEOVER';

        // Audio Handling
        if (this.audioManager) {
            this.audioManager.stopBgm();
            if (!win) {
                this.audioManager.playDie();
            } else {
                // Determine if we should play specific win sound? 
                // For Mercy, maybe silence or a specific chime?
                // Currently no win sound, so just silence BGM is fine.
            }
        }

        // Release Cursor Lock
        if (this.raycaster) {
            this.raycaster.unlockPointer();
        }

        // Force Reveal on Game Over
        this.spirit.visible = true;

        this.renderer.draw(this.gridSystem, this.player, this.spirit, 0);
        // this.uiManager.showGameOver(msg, win); // Deprecated by ScreenManager Video

        if (this.screenManager) {
            this.screenManager.showGameOverVideo(this.turnCount, win);
        }
    }

    updateEnvironment() {
        const isSafe = this.gridSystem.isSafe(this.player.x, this.player.y);
        this.uiManager.updateAmbience(isSafe);
    }



    draw() {
        this.updateEnvironment();

        // Sync 3D Environment
        if (this.raycaster) {
            this.raycaster.updateLightMap(this.gridSystem);
        }

        let rotation = 0;
        if (this.raycaster && this.raycaster.player) {
            // Calculate angle from DirX, DirY
            // Invert X because 3D view is mirrored
            rotation = Math.atan2(this.raycaster.player.dirY, -this.raycaster.player.dirX);
        }

        this.renderer.draw(this.gridSystem, this.player, this.spirit, this.timeLeft, rotation);
    }
}
