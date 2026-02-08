import { GridSystem } from './GridSystem.js';
import { Player, Spirit } from './Entity.js';
import { GRID_SIZE, GAME_SETTINGS } from './Config.js';
import { UIManager } from './UIManager.js';
import { InputHandler } from './InputHandler.js';
import { TurnSystem } from './TurnSystem.js';
import { AbilitySystem } from './AbilitySystem.js';

export class GameManager {
    constructor(renderer, audioManager) {
        this.renderer = renderer;
        this.audioManager = audioManager;
        this.uiManager = new UIManager();
        this.gridSystem = new GridSystem();
        this.player = new Player(GAME_SETTINGS.PLAYER_START.x, GAME_SETTINGS.PLAYER_START.y);
        this.spirit = new Spirit(0, 0);

        // Game state
        this.turn = 'PLAYER';
        this.gameOver = false;
        this.isPaused = false;
        this.wasDanger = false;
        this.reqId = null;
        this.raycaster = null;
        this.screenManager = null;

        // Initialize subsystems
        this.inputHandler = new InputHandler(this);
        this.turnSystem = new TurnSystem(this);
        this.abilitySystem = new AbilitySystem(this);

        // Bind events
        this.inputHandler.bindEvents();
    }

    init() {
        this.gridSystem.init();
        this.player.x = GAME_SETTINGS.PLAYER_START.x;
        this.player.y = GAME_SETTINGS.PLAYER_START.y;
        this.placeSpirit();

        // Audio
        if (this.audioManager) {
            this.audioManager.stopAll();
            this.audioManager.playBgm();
        }

        // Reset subsystems
        this.turnSystem.reset();
        this.abilitySystem.reset();

        // Reset state
        this.wasDanger = false;
        this.turn = 'PLAYER';
        this.spirit.visible = false;

        this.uiManager.updateRound(this.turnSystem.turnCount);
        this.checkDanger();

        // Force Raycaster Re-init (Rebuild Map/Textures)
        if (this.raycaster) {
            this.raycaster.initMap(this.gridSystem);

            // Reset Player Position in Raycaster to match new Grid
            const startX = GAME_SETTINGS.PLAYER_START.x;
            const startY = GAME_SETTINGS.PLAYER_START.y;
            this.raycaster.player.x = this.raycaster.GRID_OFFSET + startX * this.raycaster.CELL_SIZE + this.raycaster.CELL_SIZE / 2.0;
            this.raycaster.player.y = this.raycaster.GRID_OFFSET + startY * this.raycaster.CELL_SIZE + this.raycaster.CELL_SIZE / 2.0;
        }

        // Start Animation Loop
        this.reqId = requestAnimationFrame((ts) => this.turnSystem.loop(ts));

        console.log("Game Initialized (Strict Turn Mode)");
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

        // Inject Audio Manager to Raycaster
        if (this.audioManager) {
            this.raycaster.setAudioManager(this.audioManager);
        }

        // Initial sync
        this.raycaster.updateLightMap(this.gridSystem);

        // Bind Callback: 3D Movement -> 2D Logic
        this.raycaster.onPlayerMove = (dx, dy) => {
            console.log(`3D Move Detected: ${dx}, ${dy}`);
            this.inputHandler.handlePlayerMove(dx, dy);
        };
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

    /**
     * Centralized State Checker
     * Returns TRUE if game ended
     */
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
        let highScore = 0;
        try {
            highScore = parseInt(localStorage.getItem('survival_record') || '0', 10);
        } catch (e) {
            console.warn("Storage access failed", e);
        }

        let isMercy = false;
        // If we survived longer than a non-zero record, the Spirit grants mercy
        if (this.turnSystem.turnCount > highScore && highScore > 0) {
            // No longer grant automatic win on new record
            // Just logging or UI feedback could happen, but 'win' stays as passed in.
        }

        // Update Record if beaten
        if (this.turnSystem.turnCount > highScore) {
            try {
                localStorage.setItem('survival_record', this.turnSystem.turnCount);
                console.log(`New Record Set: ${this.turnSystem.turnCount}`);
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
            }
        }

        // Release Cursor Lock
        if (this.raycaster) {
            this.raycaster.unlockPointer();
        }

        // Force Reveal on Game Over
        this.spirit.visible = true;

        this.renderer.draw(this.gridSystem, this.player, this.spirit, 0);

        if (this.screenManager) {
            this.screenManager.showGameOverVideo(this.turnSystem.turnCount, win);
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

        this.renderer.draw(this.gridSystem, this.player, this.spirit, this.turnSystem.timeLeft, rotation);
    }
}
