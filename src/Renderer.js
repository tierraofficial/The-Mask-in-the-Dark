import { TILE_SIZE, COLORS, GRID_SIZE, ANIMATION_SPEED, GAME_SETTINGS } from './Config.js';

export class Renderer {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Animation States: 2D array storing opacity/fade value (0.0 to 1.0)
        // 0.0 = Fully OFF color, 1.0 = Fully ON color
        this.fadeStates = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0));
    }

    /**
     * @param {GridSystem} gridSystem 
     * @param {Player} player 
     * @param {Spirit} spirit 
     */
    draw(gridSystem, player, spirit, timeLeft) {
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

        // Update Fade States
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const target = gridSystem.isSafe(x, y) ? 1.0 : 0.0;
                let current = this.fadeStates[x][y];

                // Ease-Out Interpolation (LCD Ghosting feel)
                const diff = target - current;
                if (Math.abs(diff) < 0.01) {
                    current = target;
                } else {
                    current += diff * ANIMATION_SPEED; // Ease factor
                }
                this.fadeStates[x][y] = current;
            }
        }

        this.ctx.save();
        // this.ctx.translate(offsetX, offsetY); // Assume 600x600 matches config

        // Draw LCD Grid Cells
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const fadeVal = this.fadeStates[x][y]; // 0 to 1

                const posX = x * TILE_SIZE;
                const posY = y * TILE_SIZE;
                const size = TILE_SIZE; // Leave a small gap for LCD grid effect

                // Base "OFF" pixel
                this.ctx.fillStyle = COLORS.OFF;
                this.ctx.fillRect(posX + 1, posY + 1, size - 2, size - 2);

                // "ON" pixel overlay (Lit with Warm Glow)
                if (fadeVal > 0.01) {
                    this.ctx.save();
                    this.ctx.globalAlpha = fadeVal;
                    this.ctx.fillStyle = COLORS.ON;

                    // Soft Warm Bloom
                    if (fadeVal > 0.3) {
                        this.ctx.shadowBlur = 20;
                        this.ctx.shadowColor = 'rgba(253, 253, 202, 0.4)'; // Warm glow
                    }

                    this.ctx.fillRect(posX + 1, posY + 1, size - 2, size - 2);
                    this.ctx.restore();
                }
            }
        }

        // Draw Player (High Contrast Hollow Box)
        if (player) {
            this.ctx.save();

            const pSize = TILE_SIZE - 8;
            const pOff = 4;

            // Blink Effect (Faster: 300ms)
            if (Math.floor(Date.now() / 300) % 2 === 0) {
                // Outer Black Stroke (Contrast)
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 6;
                this.ctx.strokeRect(player.x * TILE_SIZE + pOff, player.y * TILE_SIZE + pOff, pSize, pSize);

                // Inner Color Stroke
                this.ctx.strokeStyle = COLORS.PLAYER;
                this.ctx.lineWidth = 3;
                this.ctx.shadowBlur = 0; // Keep it crisp
                this.ctx.strokeRect(player.x * TILE_SIZE + pOff, player.y * TILE_SIZE + pOff, pSize, pSize);
            }
            this.ctx.restore();
        }

        // Draw Spirit (Red Dot) - Only if visible or Dead/Win
        const isVisible = spirit && spirit.hp > 0 && (spirit.visible || player === null); // Hack: player is null or some gameover flag if passed? 
        // Better: Renderer doesn't know gameover state directly unless passed.
        // Let's rely on spirit.visible being set to true on Game Over by Manager, OR pass a flag.
        // Actually, let's just use the visibility flag.

        if (spirit && spirit.hp > 0 && spirit.visible) {
            this.ctx.save();
            this.ctx.fillStyle = COLORS.SPIRIT;

            // Subtle glow
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = 'rgba(255, 68, 68, 0.6)';

            const sX = spirit.x * TILE_SIZE + TILE_SIZE / 2;
            const sY = spirit.y * TILE_SIZE + TILE_SIZE / 2;

            // Draw Circle
            this.ctx.beginPath();
            this.ctx.arc(sX, sY, TILE_SIZE * 0.25, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        }

        this.ctx.restore();
    }
}
