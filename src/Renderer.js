import { TILE_SIZE, COLORS, GRID_SIZE, ANIMATION_SPEED, GAME_SETTINGS } from './Config.js';

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Animation States: 2D array storing opacity/fade value (0.0 to 1.0)
        // 0.0 = Fully OFF color, 1.0 = Fully ON color
        this.fadeStates = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));

        // Warning States: 2D array for Red Flash (0.0 to 1.0)
        this.warningStates = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));

        // Spirit Animation State
        this.spiritAnimX = 0;
        this.spiritAnimY = 0;
        this.spiritTargetX = 0;
        this.spiritTargetY = 0;

        // Visual Effects State
        this.shakeIntensity = 0;
        // Damage Flash local grid state (0.0 to 1.0)
        this.damageFlashStates = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    }

    triggerDamageEffect(x, y) {
        this.shakeIntensity = 15;
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            this.damageFlashStates[x][y] = 1.0;
        }
    }

    triggerWarning(x, y) {
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            this.warningStates[x][y] = 1.0;
        }
    }

    /**
     * @param {GridSystem} gridSystem 
     * @param {Player} player 
     * @param {Spirit} spirit 
     */
    draw(gridSystem, player, spirit, timeLeft, rotationAngle) {
        // ... (Background and Timer Bar code remains same) ...

        // ... (Fade States code remains same) ...
        // ... (LCD Grid Cells code remains same) ...


        // Clear background
        this.ctx.fillStyle = COLORS.BG;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Timer Bar (Top)
        if (timeLeft !== undefined) {
            const maxTime = GAME_SETTINGS.TURN_TIME_LIMIT;
            const pct = Math.max(0, timeLeft / maxTime);

            const barHeight = 8;
            this.ctx.fillStyle = pct < 0.3 ? '#ff0000' : COLORS.ON;
            this.ctx.fillRect(0, 0, this.canvas.width * pct, barHeight);
        }

        // Center the grid (if canvas is larger than grid, typically match size)
        const gridW = GRID_SIZE * TILE_SIZE;
        const gridH = GRID_SIZE * TILE_SIZE;

        // Update Fade States & Warning States
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                // 1. Regular Light State
                const target = gridSystem.isSafe(x, y) ? 1.0 : 0.0;
                let current = this.fadeStates[x][y];
                const diff = target - current;
                if (Math.abs(diff) < 0.01) current = target;
                else current += diff * ANIMATION_SPEED;
                this.fadeStates[x][y] = current;

                // 2. Warning State (Decay)
                if (this.warningStates[x][y] > 0) {
                    this.warningStates[x][y] -= 0.05; // Decay Speed
                    if (this.warningStates[x][y] < 0) this.warningStates[x][y] = 0;
                }

                // 3. Damage Flash State (Decay)
                if (this.damageFlashStates[x][y] > 0) {
                    this.damageFlashStates[x][y] -= 0.1; // Fast Decay
                    if (this.damageFlashStates[x][y] < 0) this.damageFlashStates[x][y] = 0;
                }
            }
        }

        this.ctx.save();

        // Apply Shake Effect
        if (this.shakeIntensity > 0) {
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity;
            this.ctx.translate(rx, ry);

            this.shakeIntensity *= 0.85; // Fast Decay
            if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;
        }

        // Draw LCD Grid Cells
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const fadeVal = this.fadeStates[x][y]; // 0 to 1
                const warnVal = this.warningStates[x][y]; // 0 to 1

                // Mirror Rendering (Flip X) to match 3D View
                const posX = (GRID_SIZE - 1 - x) * TILE_SIZE;
                const posY = y * TILE_SIZE;
                const size = TILE_SIZE; // Leave a small gap for LCD grid effect

                // Base "OFF" pixel
                this.ctx.fillStyle = COLORS.OFF;
                this.ctx.fillRect(posX + 1, posY + 1, size - 2, size - 2);

                // "ON" pixel overlay (Lit with Warm Glow) OR "WARNING" (Red)
                // We combine them. If Warning is high, it overrides.

                if (fadeVal > 0.01 || warnVal > 0.01) {
                    this.ctx.save();

                    // Determine Color
                    if (warnVal > 0.1) {
                        // Red Flash
                        this.ctx.globalAlpha = warnVal;
                        this.ctx.fillStyle = '#ff0000';
                        this.ctx.shadowBlur = 15;
                        this.ctx.shadowColor = '#ff4444';
                    } else {
                        // Regular Light
                        this.ctx.globalAlpha = fadeVal;
                        this.ctx.fillStyle = COLORS.ON;

                        if (fadeVal > 0.3) {
                            this.ctx.shadowBlur = 20;
                            this.ctx.shadowColor = 'rgba(253, 253, 202, 0.4)';
                        }
                    }

                    this.ctx.fillRect(posX + 1, posY + 1, size - 2, size - 2);
                    this.ctx.restore();
                }

                // NEW: Damage Flash Overlay (White Flash on specific tile)
                const flashVal = this.damageFlashStates[x][y];
                if (flashVal > 0.01) {
                    this.ctx.save();
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${flashVal})`;
                    this.ctx.shadowColor = 'white';
                    this.ctx.shadowBlur = 20;
                    this.ctx.fillRect(posX + 1, posY + 1, size - 2, size - 2);
                    this.ctx.restore();
                }
            }
        }

        // Draw Player (Pulse Compass Triangle)
        if (player) {
            this.ctx.save();
            // Mirror X Position
            const cx = (GRID_SIZE - 1 - player.x) * TILE_SIZE + TILE_SIZE / 2;
            const cy = player.y * TILE_SIZE + TILE_SIZE / 2;

            // Move to center and rotate
            this.ctx.translate(cx, cy);
            if (rotationAngle !== undefined) {
                this.ctx.rotate(rotationAngle);
            }

            // Pulse Scale
            const pulse = 1.0 + Math.sin(Date.now() / 200) * 0.1;
            this.ctx.scale(pulse, pulse);

            // Draw Rounded Triangle
            const size = TILE_SIZE * 0.4;
            this.ctx.fillStyle = '#fffacd'; // Pale Yellow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'rgba(255, 250, 205, 0.5)';

            this.ctx.beginPath();
            // Triangle pointing UP (since 3D Forward is -Y, and canvas 0 is Right, we need to adjust)
            this.ctx.moveTo(size, 0); // Tip
            this.ctx.lineTo(-size * 0.7, -size * 0.7);
            this.ctx.quadraticCurveTo(-size * 0.5, 0, -size * 0.7, size * 0.7);
            this.ctx.closePath();

            // Style: Rounder, Thicker, Retro Grey
            this.ctx.lineJoin = 'round';
            this.ctx.lineWidth = 5;
            this.ctx.strokeStyle = '#606060'; // Dark Grey (softer than black, but visible)
            this.ctx.stroke();

            this.ctx.fill(); // Fill AFTER stroke to keep the inner shape crisp? 
            // Standard is Stroke after Fill to overlay. 
            // If we want rounded corners, Stroke must be the outer edge.
            // Let's do Fill then Stroke, but with round join.
            // Wait, if I fill then stroke, the stroke covers half the fill edge.
            // That's fine.

            this.ctx.restore();
        }

        // Draw Spirit (Red Dot) - Only if visible or Dead/Win
        const isVisible = spirit && spirit.hp > 0 && (spirit.visible || player === null); // Hack: player is null or some gameover flag if passed? 
        // Better: Renderer doesn't know gameover state directly unless passed.
        // Let's rely on spirit.visible being set to true on Game Over by Manager, OR pass a flag.
        // Actually, let's just use the visibility flag.

        if (spirit && spirit.hp > 0 && spirit.visible) {
            // Fix: On first reveal, immediately sync animation position (no jump from 0,0)
            if (this.spiritTargetX === 0 && this.spiritTargetY === 0) {
                this.spiritAnimX = spirit.x;
                this.spiritAnimY = spirit.y;
                this.spiritTargetX = spirit.x;
                this.spiritTargetY = spirit.y;
            }

            // Update animation target if spirit moved
            if (spirit.x !== this.spiritTargetX || spirit.y !== this.spiritTargetY) {
                this.spiritTargetX = spirit.x;
                this.spiritTargetY = spirit.y;
            }

            // Smooth lerp animation (0.5s ~ 500ms)
            // Using lerp factor of 0.1 per frame (~60fps) gives ~0.5s transition
            const lerpFactor = 0.1;
            this.spiritAnimX += (this.spiritTargetX - this.spiritAnimX) * lerpFactor;
            this.spiritAnimY += (this.spiritTargetY - this.spiritAnimY) * lerpFactor;

            this.ctx.save();
            this.ctx.fillStyle = COLORS.SPIRIT;

            // Subtle glow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'rgba(255, 68, 68, 0.6)';

            // Mirror X (use animated position)
            const sX = (GRID_SIZE - 1 - this.spiritAnimX) * TILE_SIZE + TILE_SIZE / 2;
            const sY = this.spiritAnimY * TILE_SIZE + TILE_SIZE / 2;

            // Draw Circle
            this.ctx.beginPath();
            this.ctx.arc(sX, sY, TILE_SIZE * 0.25, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        this.ctx.restore();
    }
}
