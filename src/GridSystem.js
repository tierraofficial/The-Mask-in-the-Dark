import { GRID_SIZE, GAME_SETTINGS } from './Config.js';

export class GridSystem {
    constructor() {
        this.grid = [];     // 2D array: 0 for OFF, 1 for ON
        this.lightCount = 0;
    }

    init() {
        this.generateLevel();
    }

    generateLevel() {
        // 1. Random Noise
        for (let x = 0; x < GRID_SIZE; x++) {
            this.grid[x] = [];
            for (let y = 0; y < GRID_SIZE; y++) {
                // Use Config for Light Chance
                this.grid[x][y] = Math.random() < GAME_SETTINGS.LIGHT_CHANCE ? 1 : 0;
            }
        }

        // 2. Enforce Player Safe Zone (Center Cross)
        const cx = GAME_SETTINGS.PLAYER_START.x;
        const cy = GAME_SETTINGS.PLAYER_START.y;

        this.grid[cx][cy] = 1;      // Player Spot
        // Safe neighbors
        const safeNeighbors = [{ x: 0, y: 1 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: -1, y: 0 }];
        safeNeighbors.forEach(n => {
            const nx = cx + n.x;
            const ny = cy + n.y;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                this.grid[nx][ny] = 1;
            }
        });

        // 3. Ensure some darkness (Corner check)
        if (this.grid[0][0] && this.grid[0][4] && this.grid[4][0] && this.grid[4][4]) {
            this.grid[0][0] = 0;
        }

        this.updateLightCount();
    }

    /**
     * Standard Lights Out Flip: Toggle self + 4 orthogonal neighbors
     */
    flip(x, y) {
        if (!this.isValid(x, y)) return;

        // Toggle Self
        this.grid[x][y] = 1 - this.grid[x][y];

        // Toggle Neighbors
        const coords = [
            [0, 1], [0, -1], [1, 0], [-1, 0]
        ];

        coords.forEach(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            if (this.isValid(nx, ny)) {
                this.grid[nx][ny] = 1 - this.grid[nx][ny];
            }
        });

        this.updateLightCount();
    }

    isValid(x, y) {
        return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
    }

    isSafe(x, y) {
        if (!this.isValid(x, y)) return false;
        return this.grid[x][y] === 1;
    }

    // Force turn off a specific lit tile
    corruptLightAt(x, y) {
        if (this.isValid(x, y)) {
            if (this.grid[x][y] === 1) {
                this.grid[x][y] = 0;
                this.updateLightCount();
                return true;
            }
        }
        return false;
    }

    // Force turn off a random lit tile (Penalty)
    corruptRandomLight() {
        const litTiles = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                if (this.grid[x][y] === 1) litTiles.push({ x, y });
            }
        }

        if (litTiles.length > 0) {
            const target = litTiles[Math.floor(Math.random() * litTiles.length)];
            this.grid[target.x][target.y] = 0; // Force OFF
            this.updateLightCount();
            return target;
        }
        return null;
    }

    updateLightCount() {
        this.lightCount = this.grid.flat().reduce((a, b) => a + b, 0);
    }
}
