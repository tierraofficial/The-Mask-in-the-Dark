import { GAME_SETTINGS, RENDER_3D_SETTINGS } from './Config.js';
/**
 * Raycaster Engine Module
 * Extracted from raycasting_demo.html
 */

export class Raycaster {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false });

        // Configuration
        this.width = 0; // Set in resize
        this.height = 0;
        this.MAP_SIZE = 42;
        this.TEX_SIZE = 128;
        this.WALL_HEIGHT_SCALE = 3.0;
        this.CELL_SIZE = 8;
        this.GRID_OFFSET = 1;
        this.GRID_ROWS = 5;
        this.GRID_COLS = 5;

        // State
        this.lastTime = 0;
        this.textures = {};
        this.worldMap = []; // Uint8Array 2D
        this.roomLightMap = []; // 2D array of bools
        this.doorStates = {}; // { x: { y: { offset, state } } }

        this.player = {
            x: 1 + 2 * 8 + 4.0,
            y: 1 + 2 * 8 + 4.0,
            dirX: 0, dirY: -1,
            planeX: -0.80, planeY: 0,
            rotSpeed: GAME_SETTINGS.MOUSE_SENSITIVITY,
            moveSpeed: GAME_SETTINGS.MOVE_SPEED
        };

        this.keys = { w: false, a: false, s: false, d: false };
        this.isPointerLocked = false;

        this.lighting = {
            targetLevel: 1.0,
            currentLevel: 1.0,
            minBrightness: RENDER_3D_SETTINGS.MIN_BRIGHTNESS,
            brightFogDist: RENDER_3D_SETTINGS.BRIGHT_FOG_DIST,
            darkFogDist: RENDER_3D_SETTINGS.DARK_FOG_DIST
        };

        this.game = {
            doorCooldown: 0.0,
            maxCooldown: GAME_SETTINGS.TURN_TIME_LIMIT / 1000
        };

        this.COLORS_BASE = {
            ceiling: { r: 26, g: 26, b: 26 },
            floorFar: { r: 17, g: 17, b: 17 },
            floor: { r: 93, g: 85, b: 65 }
        };

        // UI Elements (Optional bindings)
        this.ui = {
            fps: document.getElementById('rc-fps'),
            room: document.getElementById('rc-room'),
            door: document.getElementById('rc-door')
        };
    }

    setAudioManager(audioManager) {
        this.audioManager = audioManager;
    }

    init(gridSystem) {
        this.generateTextures();
        this.initMap(gridSystem);

        // Sync Player Position from Config
        const startX = GAME_SETTINGS.PLAYER_START.x;
        const startY = GAME_SETTINGS.PLAYER_START.y;
        this.player.x = this.GRID_OFFSET + startX * this.CELL_SIZE + this.CELL_SIZE / 2.0;
        this.player.y = this.GRID_OFFSET + startY * this.CELL_SIZE + this.CELL_SIZE / 2.0;

        this.initInput();
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Start Loop
        requestAnimationFrame((ts) => this.loop(ts));
    }

    loop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        if (this.ui.fps && deltaTime > 0 && timestamp % 500 < 20) {
            this.ui.fps.textContent = 'FPS: ' + Math.round(1000 / deltaTime);
        }

        this.updateDoors(deltaTime);
        this.updateLighting(deltaTime);
        this.updatePhysics();
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }

    resize() {
        // Fit to parent container
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx.imageSmoothingEnabled = false;
    }

    // --- Data Generation ---

    generateTextures() {
        const createTexture = (name, drawFn) => {
            const c = document.createElement('canvas');
            c.width = this.TEX_SIZE;
            c.height = this.TEX_SIZE;
            const cx = c.getContext('2d');
            drawFn(cx, this.TEX_SIZE);
            this.textures[name] = c;
        };

        createTexture('wall', (cx, s) => {
            cx.fillStyle = '#C2B280';
            cx.fillRect(0, 0, s, s);
            for (let i = 0; i < 500; i++) {
                const shade = Math.random();
                cx.fillStyle = shade > 0.5 ? '#b0a070' : '#d4c490';
                cx.globalAlpha = 0.3;
                cx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
            }
            cx.globalAlpha = 1.0;
            cx.fillStyle = 'rgba(0,0,0,0.03)';
            for (let i = 0; i < s; i += 8) cx.fillRect(i, 0, 2, s);
            cx.fillStyle = '#5d4037';
            cx.fillRect(0, s - 6, s, 6);
            cx.fillStyle = '#4a3028';
            cx.fillRect(0, s - 6, s, 1);
        });

        createTexture('door', (cx, s) => {
            cx.fillStyle = '#4a3020';
            cx.fillRect(0, 0, s, s);
            cx.fillStyle = 'rgba(0,0,0,0.2)';
            for (let i = 0; i < s; i += 2) {
                if (Math.random() > 0.6) cx.fillRect(i, 0, 1, s);
            }
            cx.strokeStyle = '#2a1a10';
            cx.lineWidth = 3;
            cx.strokeRect(0, 0, s, s);
            cx.fillStyle = '#cccccc';
            cx.beginPath();
            cx.arc(s - 12, s / 2, 4, 0, Math.PI * 2);
            cx.fill();
        });

        createTexture('jamb', (cx, s) => {
            cx.fillStyle = '#3e2b20';
            cx.fillRect(0, 0, s, s);
            cx.fillStyle = 'rgba(0,0,0,0.3)';
            for (let i = 0; i < s; i += 3) {
                if (Math.random() > 0.5) cx.fillRect(i, 0, 1, s);
            }
        });
    }

    initMap() {
        for (let x = 0; x < this.MAP_SIZE; x++) this.worldMap[x] = new Uint8Array(this.MAP_SIZE);

        const startOffset = this.GRID_OFFSET;
        const endLimit = startOffset + this.GRID_ROWS * this.CELL_SIZE;

        // Init Light Map (Dummy Data for now)
        for (let i = 0; i < this.GRID_ROWS; i++) {
            this.roomLightMap[i] = [];
            for (let j = 0; j < this.GRID_COLS; j++) {
                this.roomLightMap[i][j] = (Math.random() > 0.5);
            }
        }

        // Generate Walls based on 2D Grid Logic (Demo Logic)
        for (let x = startOffset; x <= endLimit; x++) {
            for (let y = startOffset; y <= endLimit; y++) {
                const relX = x - startOffset;
                const relY = y - startOffset;
                const isVerticalWall = (relX % this.CELL_SIZE === 0);
                const isHorizontalWall = (relY % this.CELL_SIZE === 0);

                if (relX > this.GRID_ROWS * this.CELL_SIZE || relY > this.GRID_COLS * this.CELL_SIZE) continue;

                if (isVerticalWall || isHorizontalWall) {
                    this.worldMap[x][y] = 1;
                    const isMidX = (relX % this.CELL_SIZE === this.CELL_SIZE / 2);
                    const isMidY = (relY % this.CELL_SIZE === this.CELL_SIZE / 2);

                    if ((isVerticalWall && isMidY && !isHorizontalWall && relX > 0 && relX < this.GRID_ROWS * this.CELL_SIZE) ||
                        (isHorizontalWall && isMidX && !isVerticalWall && relY > 0 && relY < this.GRID_COLS * this.CELL_SIZE)) {
                        this.worldMap[x][y] = 2; // Door
                        if (!this.doorStates[x]) this.doorStates[x] = {};
                        this.doorStates[x][y] = { offset: 0.0, state: 'CLOSED' };
                    }
                }
            }
        }
    }

    // --- Bridge Methods ---

    updateLightMap(gridSystem) {
        if (!gridSystem) return;
        for (let i = 0; i < this.GRID_ROWS; i++) {
            for (let j = 0; j < this.GRID_COLS; j++) {
                if (this.roomLightMap[i] && this.roomLightMap[i][j] !== undefined) {
                    this.roomLightMap[i][j] = (gridSystem.grid[i][j] === 1);
                }
            }
        }
    }

    setSpiritPosition(gx, gy) {
        this.spiritPos = { x: gx, y: gy };
    }

    initInput() {
        // Pointer Lock & Interaction
        this.canvas.addEventListener('mousedown', (e) => {
            if (document.pointerLockElement !== this.canvas) {
                this.canvas.requestPointerLock();
            } else {
                // Left Click to Interact
                if (e.button === 0 && this.game.doorCooldown <= 0) {
                    this.attemptInteract();
                }
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.rotateCamera(-e.movementX * this.player.rotSpeed);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = true;
        });

        document.addEventListener('keyup', (e) => {
            if (e.key.toLowerCase() in this.keys) this.keys[e.key.toLowerCase()] = false;
        });
    }

    unlockPointer() {
        if (document.pointerLockElement === this.canvas) {
            document.exitPointerLock();
        }
    }

    rotateCamera(angle) {
        const oldDirX = this.player.dirX;
        const oldPlaneX = this.player.planeX;
        this.player.dirX = this.player.dirX * Math.cos(angle) - this.player.dirY * Math.sin(angle);
        this.player.dirY = oldDirX * Math.sin(angle) + this.player.dirY * Math.cos(angle);
        this.player.planeX = this.player.planeX * Math.cos(angle) - this.player.planeY * Math.sin(angle);
        this.player.planeY = oldPlaneX * Math.sin(angle) + this.player.planeY * Math.cos(angle);
    }

    // --- Updates ---

    updateLighting(dt) {
        // Update global lighting value towards target
        const speed = 3.0;
        const seconds = dt / 1000;
        const l = this.lighting;

        if (l.currentLevel < l.targetLevel) {
            l.currentLevel += speed * seconds;
            if (l.currentLevel > l.targetLevel) l.currentLevel = l.targetLevel;
        } else if (l.currentLevel > l.targetLevel) {
            l.currentLevel -= speed * seconds;
            if (l.currentLevel < l.targetLevel) l.currentLevel = l.targetLevel;
        }
    }

    updateDoors(dt) {
        const seconds = dt / 1000;
        const openSpeed = 2.0;

        // 1. CD
        if (this.game.doorCooldown > 0) {
            this.game.doorCooldown -= seconds;
            if (this.game.doorCooldown < 0) this.game.doorCooldown = 0;
        }

        if (this.ui.door) {
            if (this.game.doorCooldown > 0) {
                this.ui.door.textContent = `DOOR: WAIT ${this.game.doorCooldown.toFixed(1)}s`;
                this.ui.door.style.color = '#ff4444';
            } else {
                this.ui.door.textContent = "DOOR: READY";
                this.ui.door.style.color = '#44ff44';
            }
        }

        // 2. Auto Close & Animation
        for (let x in this.doorStates) {
            for (let y in this.doorStates[x]) {
                const door = this.doorStates[x][y];
                const dx = this.player.x - (parseInt(x) + 0.5);
                const dy = this.player.y - (parseInt(y) + 0.5);
                const distSq = dx * dx + dy * dy;

                if (distSq > 9.0) {
                    if (door.state === 'OPEN' || door.state === 'OPENING') {
                        door.state = 'CLOSING';
                    }
                }

                if (door.state === 'OPENING') {
                    door.offset += openSpeed * seconds;
                    if (door.offset >= 1.0) { door.offset = 1.0; door.state = 'OPEN'; }
                } else if (door.state === 'CLOSING') {
                    door.offset -= openSpeed * seconds;
                    if (door.offset <= 0.0) { door.offset = 0.0; door.state = 'CLOSED'; }
                }
            }
        }

        // 3. Interaction
        // Manual Interaction on Click now (see initInput)
    }

    attemptInteract() {
        // Raycast for door interaction
        let rX = this.player.x;
        let rY = this.player.y;
        let mX = Math.floor(rX);
        let mY = Math.floor(rY);

        const rDirX = (this.player.dirX === 0) ? 0.00001 : this.player.dirX;
        const rDirY = (this.player.dirY === 0) ? 0.00001 : this.player.dirY;
        const deltaX = Math.abs(1 / rDirX);
        const deltaY = Math.abs(1 / rDirY);
        let stepX, stepY, sideX, sideY;

        if (rDirX < 0) { stepX = -1; sideX = (rX - mX) * deltaX; }
        else { stepX = 1; sideX = (mX + 1.0 - rX) * deltaX; }

        if (rDirY < 0) { stepY = -1; sideY = (rY - mY) * deltaY; }
        else { stepY = 1; sideY = (mY + 1.0 - rY) * deltaY; }

        let hit = false;
        let dist = 0;
        const MAX_INTERACT_DIST = 2.0;

        while (!hit && dist < MAX_INTERACT_DIST) {
            if (sideX < sideY) { sideX += deltaX; mX += stepX; dist = sideX - deltaX; }
            else { sideY += deltaY; mY += stepY; dist = sideY - deltaY; }

            if (mX < 0 || mX >= this.MAP_SIZE || mY < 0 || mY >= this.MAP_SIZE) { hit = true; break; }

            const tile = this.worldMap[mX][mY];
            if (tile === 1) hit = true;
            else if (tile === 2) {
                hit = true;
                const door = this.doorStates[mX]?.[mY];
                if (door && (door.state === 'CLOSED' || door.state === 'CLOSING')) {
                    door.state = 'OPENING';
                    this.game.doorCooldown = this.game.maxCooldown;
                    if (this.audioManager) this.audioManager.playDoor();
                }
            }
        }
    }

    updatePhysics() {
        const getRoomIndex = () => {
            const gridX = Math.floor((this.player.x - this.GRID_OFFSET) / this.CELL_SIZE);
            const gridY = Math.floor((this.player.y - this.GRID_OFFSET) / this.CELL_SIZE);
            return { x: gridX, y: gridY };
        };

        // Room Logic Sync
        const roomIdx = getRoomIndex();
        if (this.ui.room) this.ui.room.textContent = `ROOM: [${roomIdx.x}, ${roomIdx.y}]`;

        // Check for Room Change (Movement Trigger)
        if (this.lastRoom) {
            if (roomIdx.x !== this.lastRoom.x || roomIdx.y !== this.lastRoom.y) {
                const dx = roomIdx.x - this.lastRoom.x;
                const dy = roomIdx.y - this.lastRoom.y;

                // Only trigger if valid grid movement (1 step orthogonal)
                if (Math.abs(dx) + Math.abs(dy) === 1) {
                    console.log("3D Room Change Detected:", dx, dy);
                    if (this.onPlayerMove) {
                        this.onPlayerMove(dx, dy);
                    }
                }
                this.lastRoom = roomIdx;
            }
        } else {
            this.lastRoom = roomIdx;
        }

        if (roomIdx.x >= 0 && roomIdx.x < this.GRID_ROWS && roomIdx.y >= 0 && roomIdx.y < this.GRID_COLS) {
            const isBright = this.roomLightMap[roomIdx.x][roomIdx.y];
            this.lighting.targetLevel = isBright ? 1.0 : 0.0;
        }

        // Collision & Move
        const checkCollision = (x, y) => {
            const mapX = Math.floor(x);
            const mapY = Math.floor(y);
            const tile = this.worldMap[mapX][mapY];
            if (tile === 1) return true;
            if (tile === 2) {
                const door = this.doorStates[mapX]?.[mapY];
                if (door && door.offset < 0.7) return true;
            }
            return false;
        };
        const r = 0.25;
        const collide = (x, y) => checkCollision(x, y) || checkCollision(x + r, y) || checkCollision(x - r, y) || checkCollision(x, y + r) || checkCollision(x, y - r);

        const p = this.player;
        const pX = p.x;
        const pY = p.y;
        if (this.keys.w) {
            const nx = p.x + p.dirX * p.moveSpeed;
            if (!collide(nx, p.y)) p.x = nx;
            const ny = p.y + p.dirY * p.moveSpeed;
            if (!collide(p.x, ny)) p.y = ny;
        }
        if (this.keys.s) {
            const nx = p.x - p.dirX * p.moveSpeed;
            if (!collide(nx, p.y)) p.x = nx;
            const ny = p.y - p.dirY * p.moveSpeed;
            if (!collide(p.x, ny)) p.y = ny;
        }
        if (this.keys.d) {
            const nx = p.x + p.dirY * p.moveSpeed;
            if (!collide(nx, p.y)) p.x = nx;
            const ny = p.y - p.dirX * p.moveSpeed;
            if (!collide(p.x, ny)) p.y = ny;
        }
        if (this.keys.a) {
            const nx = p.x - p.dirY * p.moveSpeed;
            if (!collide(nx, p.y)) p.x = nx;
            const ny = p.y + p.dirX * p.moveSpeed;
            if (!collide(p.x, ny)) p.y = ny;
        }

        // Footstep Audio
        if ((this.player.x !== pX || this.player.y !== pY) && this.audioManager) {
            this.audioManager.playFootstep();
        }
    }

    // --- Rendering ---

    draw() {
        const width = this.width;
        const height = this.height;
        const ctx = this.ctx;
        const l = this.lighting;

        const globalBrightness = l.minBrightness + l.currentLevel * (1.0 - l.minBrightness);
        const currentFogDist = l.darkFogDist + l.currentLevel * (l.brightFogDist - l.darkFogDist);

        const scaleColor = (c, factor) => `rgb(${Math.floor(c.r * factor)}, ${Math.floor(c.g * factor)}, ${Math.floor(c.b * factor)})`;

        // Ceiling
        ctx.fillStyle = scaleColor(this.COLORS_BASE.ceiling, globalBrightness);
        ctx.fillRect(0, 0, width, height / 2);

        // Floor
        const floorGradient = ctx.createLinearGradient(0, height / 2, 0, height);
        floorGradient.addColorStop(0, scaleColor(this.COLORS_BASE.floorFar, globalBrightness));
        floorGradient.addColorStop(1, scaleColor(this.COLORS_BASE.floor, globalBrightness));
        ctx.fillStyle = floorGradient;
        ctx.fillRect(0, height / 2, width, height / 2);

        // Raycasting
        for (let x = 0; x < width; x++) {
            const cameraX = 2 * x / width - 1;
            const rayDirX = this.player.dirX + this.player.planeX * cameraX;
            const rayDirY = this.player.dirY + this.player.planeY * cameraX;

            let mapX = Math.floor(this.player.x);
            let mapY = Math.floor(this.player.y);
            let sideDistX, sideDistY;
            const deltaDistX = (rayDirX === 0) ? 1e30 : Math.abs(1 / rayDirX);
            const deltaDistY = (rayDirY === 0) ? 1e30 : Math.abs(1 / rayDirY);
            let perpWallDist, stepX, stepY;
            let hit = 0, side;

            if (rayDirX < 0) { stepX = -1; sideDistX = (this.player.x - mapX) * deltaDistX; }
            else { stepX = 1; sideDistX = (mapX + 1.0 - this.player.x) * deltaDistX; }
            if (rayDirY < 0) { stepY = -1; sideDistY = (this.player.y - mapY) * deltaDistY; }
            else { stepY = 1; sideDistY = (mapY + 1.0 - this.player.y) * deltaDistY; }

            let isDoor = false;
            let offset = 0;
            let doorOffset = 0;

            while (hit === 0) {
                if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
                else { sideDistY += deltaDistY; mapY += stepY; side = 1; }

                const tile = this.worldMap[mapX][mapY];
                if (tile === 1) hit = 1;
                else if (tile === 2) {
                    let distToBoundary = (side === 0) ? (sideDistX - deltaDistX) : (sideDistY - deltaDistY);
                    let distToMid = distToBoundary + (side === 0 ? deltaDistX : deltaDistY) * 0.5;
                    let hitPos = (side === 0) ? (this.player.y + rayDirY * distToMid) : (this.player.x + rayDirX * distToMid);
                    const mapIndex = (side === 0) ? mapY : mapX;

                    const doorObj = this.doorStates[mapX]?.[mapY];
                    const currentOpenAmount = doorObj ? doorObj.offset : 0.0;
                    if (hitPos >= mapIndex && hitPos <= (mapIndex + 1.0 - currentOpenAmount)) {
                        hit = 1;
                        isDoor = true;
                        perpWallDist = distToMid;
                        offset = hitPos - Math.floor(hitPos);
                        doorOffset = currentOpenAmount;
                    }
                }
            }

            if (!isDoor) {
                if (side === 0) perpWallDist = (sideDistX - deltaDistX);
                else perpWallDist = (sideDistY - deltaDistY);
            }

            const lineHeight = Math.floor((height * this.WALL_HEIGHT_SCALE) / perpWallDist);
            let drawStart = -lineHeight / 2 + height / 2;

            // Texture calc
            let wallX;
            if (isDoor) wallX = offset + doorOffset;
            else {
                if (side == 0) wallX = this.player.y + perpWallDist * rayDirY;
                else wallX = this.player.x + perpWallDist * rayDirX;
                wallX -= Math.floor(wallX);
            }

            let texX = Math.floor(wallX * this.TEX_SIZE);
            if (side == 0 && rayDirX > 0) texX = this.TEX_SIZE - texX - 1;
            if (side == 1 && rayDirY < 0) texX = this.TEX_SIZE - texX - 1;

            let currentTexture = this.textures.wall;
            let isJamb = false;
            if (isDoor) currentTexture = this.textures.door;
            else {
                let prevX = mapX, prevY = mapY;
                if (side === 0) prevX -= stepX; else prevY -= stepY;
                if (this.worldMap[prevX]?.[prevY] === 2) { currentTexture = this.textures.jamb; isJamb = true; }
            }

            if (currentTexture) {
                ctx.drawImage(currentTexture, texX, 0, 1, this.TEX_SIZE, x, drawStart, 1, lineHeight);
            } else {
                // Fallback
                ctx.fillStyle = '#880000';
                ctx.fillRect(x, drawStart, 1, lineHeight);
            }

            // Fog
            let brightness = 1.0 - (perpWallDist / currentFogDist);
            if (brightness < 0) brightness = 0; if (brightness > 1) brightness = 1;
            let geometricShade = 0;
            if (isJamb) geometricShade = 0.4; else if (!isDoor && side === 1) geometricShade = 0.25;
            let visibility = (1.0 - geometricShade) * brightness;
            let finalAlpha = 1.0 - (visibility * globalBrightness);
            if (finalAlpha > 0.98) finalAlpha = 0.98;
            if (finalAlpha > 0) {
                ctx.fillStyle = `rgba(0,0,0,${finalAlpha})`;
                ctx.fillRect(x, drawStart, 1, lineHeight);
            }
        }

        // Crosshair
        const cx = width / 2; const cy = height / 2; const size = 10;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx - size, cy); ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size); ctx.lineTo(cx, cy + size); ctx.stroke();
    }
}
