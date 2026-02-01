import { GAME_SETTINGS } from './Config.js';

export class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class Player extends Entity {
    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }
}

export class Spirit extends Entity {
    constructor(x, y) {
        super(x, y);
        this.hp = GAME_SETTINGS.SPIRIT_HP;
        this.visible = false; // Hidden by default
    }

    // Advanced AI: "The Hunter"
    // Advanced AI: "The Hunter" (Revised)
    act(player, gridSystem) {
        // 0. Kill Check (High Priority)
        // Only attack if player is NOT in a safe zone (Light)
        if (this.canAttack(player, gridSystem)) {
            this.x = player.x;
            this.y = player.y;
            return { action: 'ATTACK' };
        }

        // ======================================
        // NEW BEHAVIOR: Stalking Priority
        // ======================================

        const dist = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);

        // 1. If currently adjacent to player (in Dark), STAY PUT.
        // (Maintaining pressure)
        if (dist <= 1) {
            return { action: 'STALK_WAIT' };
        }

        // 2. If NOT adjacent, check if Player has ANY adjacent Dark tiles we can move to.
        // (Try to flank/ambush)
        const ambushTarget = this.findAmbushSpot(player, gridSystem);
        if (ambushTarget) {
            // Move towards that ambush spot
            // We use findPathTo simply to get to that specific tile
            const path = this.findPathToTarget(ambushTarget.x, ambushTarget.y, gridSystem);
            if (path && path.length > 0) {
                const nextStep = path[0];
                this.x = nextStep.x;
                this.y = nextStep.y;
                return { action: 'HUNT_AMBUSH' };
            }
        }

        // 3. Standard Chase (If no ambush spots or blocked)
        const path = this.findPathTo(player, gridSystem);
        if (path && path.length > 0) {
            const nextStep = path[0];
            this.x = nextStep.x;
            this.y = nextStep.y;
            return { action: 'HUNT' };
        }

        // ======================================
        // Fallback Logic (Trapped/Stuck)
        // ======================================

        // 4. Anti-Trap Check
        const territory = this.getTerritorySize(gridSystem);
        if (territory < GAME_SETTINGS.TRAP_THRESHOLD) {
            const wall = this.findWeakestWall(player, gridSystem);
            if (wall) {
                return { action: 'CORRUPT', target: wall };
            }
        }

        // 5. Greedy Random Move (Wander)
        const moves = this.getAvailableMoves(gridSystem);
        if (moves.length > 0) {
            // Pick move closest to player
            moves.sort((a, b) => {
                const dA = Math.abs(a.x - player.x) + Math.abs(a.y - player.y);
                const dB = Math.abs(b.x - player.x) + Math.abs(b.y - player.y);
                return dA - dB;
            });
            const bestMove = moves[0];
            this.x = bestMove.x;
            this.y = bestMove.y;
            return { action: 'STALK' };
        }

        // 6. Totally Stuck
        return { action: 'STUCK' };
    }

    canAttack(player, gridSystem) {
        const dist = Math.abs(this.x - player.x) + Math.abs(this.y - player.y);
        // CRITICAL FIX: Cannot attack if player is in Safe Zone (Light)
        const isPlayerSafe = gridSystem.isSafe(player.x, player.y);
        return dist <= 1 && !isPlayerSafe;
    }

    findAmbushSpot(player, gridSystem) {
        // Find all dark neighbors of the player
        const neighbors = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        let bestSpot = null;
        let minDistToSpirit = 999;

        for (let n of neighbors) {
            const nx = player.x + n.x;
            const ny = player.y + n.y;

            // Must be valid bounds AND currently Dark (valid for Spirit to stand on)
            if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
                if (!gridSystem.isSafe(nx, ny)) {
                    // This is a candidate spot. Is it reachable/closest?
                    const d = Math.abs(this.x - nx) + Math.abs(this.y - ny);
                    if (d < minDistToSpirit) {
                        minDistToSpirit = d;
                        bestSpot = { x: nx, y: ny };
                    }
                }
            }
        }
        return bestSpot;
    }

    // Generic Pathfinding to specific coordinate (BFS)
    findPathToTarget(tx, ty, gridSystem) {
        const startNode = { x: this.x, y: this.y, p: null };
        const queue = [startNode];
        const visited = new Set();
        visited.add(`${this.x},${this.y}`);

        let closestNode = startNode;
        let minDist = 999;

        while (queue.length > 0) {
            const curr = queue.shift();

            // Check if reached target
            if (curr.x === tx && curr.y === ty) {
                // Reconstruct
                let path = [];
                let tmp = curr; // Use tmp to unlike curr since we need to keep curr for logic below? Actually just reuse logic.
                // Wait, need to reconstruct from curr.
                while (tmp.p) {
                    path.unshift({ x: tmp.x, y: tmp.y });
                    tmp = tmp.p;
                }
                return path;
            }

            // Calc distance for fallback (though BFS guarantees shortest)
            const d = Math.abs(curr.x - tx) + Math.abs(curr.y - ty);
            if (d < minDist) {
                minDist = d;
                closestNode = curr;
            }

            const neighbors = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
            for (let n of neighbors) {
                const nx = curr.x + n.x;
                const ny = curr.y + n.y;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && !visited.has(key)) {
                    // Move validity: Spirit needs Dark tiles
                    if (!gridSystem.isSafe(nx, ny)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny, p: curr });
                    }
                }
            }
        }
        return null;
    }

    // Flood Fill to count connected OFF tiles
    getTerritorySize(gridSystem) {
        const queue = [{ x: this.x, y: this.y }];
        const visited = new Set();
        visited.add(`${this.x},${this.y}`);
        let count = 0;

        while (queue.length > 0) {
            const curr = queue.shift();
            count++;

            const neighbors = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
            for (let n of neighbors) {
                const nx = curr.x + n.x;
                const ny = curr.y + n.y;
                const key = `${nx},${ny}`;

                // Check Bounds, Not Visited, and IS DARK
                if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && !visited.has(key)) {
                    if (!gridSystem.isSafe(nx, ny)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }
        return count;
    }

    findWeakestWall(player, gridSystem) {
        // Find adjacent Light tiles
        const neighbors = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
        let bestWall = null;
        let minPlayerDist = 999;

        for (let n of neighbors) {
            const nx = this.x + n.x;
            const ny = this.y + n.y;

            if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5) {
                // Must be a Light (Wall) to break it
                if (gridSystem.isSafe(nx, ny)) {
                    const dist = Math.abs(nx - player.x) + Math.abs(ny - player.y);
                    if (dist < minPlayerDist) {
                        minPlayerDist = dist;
                        bestWall = { x: nx, y: ny };
                    }
                }
            }
        }
        return bestWall;
    }

    getAvailableMoves(gridSystem) {
        const moves = [];
        const neighbors = [
            { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
        ];

        for (let n of neighbors) {
            const nx = this.x + n.x;
            const ny = this.y + n.y;
            // Spirit can only move on OFF tiles (isSafe = false)
            if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && !gridSystem.isSafe(nx, ny)) {
                moves.push({ x: nx, y: ny });
            }
        }
        return moves;
    }

    findPathTo(player, gridSystem) {
        // BFS to find shortest path on DARK tiles
        const startNode = { x: this.x, y: this.y, p: null };
        const queue = [startNode];
        const visited = new Set();
        visited.add(`${this.x},${this.y}`);

        let closestNode = startNode;
        let minDist = 999;

        const tx = player.x;
        const ty = player.y;

        while (queue.length > 0) {
            const curr = queue.shift();

            const dist = Math.abs(curr.x - tx) + Math.abs(curr.y - ty);
            if (dist < minDist) {
                minDist = dist;
                closestNode = curr;
            }
            if (dist <= 1 && !gridSystem.isSafe(tx, ty)) {
                if (dist === 0) {
                    closestNode = curr;
                    break;
                }
            }

            const neighbors = [
                { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }
            ];

            for (let n of neighbors) {
                const nx = curr.x + n.x;
                const ny = curr.y + n.y;
                const key = `${nx},${ny}`;

                if (nx >= 0 && nx < 5 && ny >= 0 && ny < 5 && !visited.has(key)) {
                    // Valid Move: Must be Dark
                    if (!gridSystem.isSafe(nx, ny)) {
                        visited.add(key);
                        queue.push({ x: nx, y: ny, p: curr });
                    }
                }
            }
        }

        const isPlayerReachable = (closestNode.x === tx && closestNode.y === ty);
        if (!isPlayerReachable) return null; // No complete path to player.

        // Reconstruct
        let path = [];
        let curr = closestNode;
        while (curr.p) {
            path.unshift({ x: curr.x, y: curr.y });
            curr = curr.p;
        }
        return path;
    }
}
