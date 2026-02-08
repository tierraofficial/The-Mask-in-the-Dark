/**
 * Pathfinding - 通用寻路算法工具
 * 使用 BFS (广度优先搜索) 在网格上寻找最短路径
 */

/**
 * 使用 BFS 寻找从起点到目标点的最短路径
 * @param {number} startX - 起点 X 坐标
 * @param {number} startY - 起点 Y 坐标
 * @param {number} targetX - 目标 X 坐标
 * @param {number} targetY - 目标 Y 坐标
 * @param {number} gridSize - 网格大小
 * @param {Function} isWalkable - 判断格子是否可通行的函数 (x, y) => boolean
 * @returns {Array|null} - 路径数组 [{x, y}, ...] 或 null（无法到达）
 */
export function findPath(startX, startY, targetX, targetY, gridSize, isWalkable) {
    const startNode = { x: startX, y: startY, parent: null };
    const queue = [startNode];
    const visited = new Set();
    visited.add(`${startX},${startY}`);

    let closestNode = startNode;
    let minDist = manhattanDistance(startX, startY, targetX, targetY);

    while (queue.length > 0) {
        const current = queue.shift();

        // 到达目标
        if (current.x === targetX && current.y === targetY) {
            return reconstructPath(current);
        }

        // 记录最接近目标的节点（用于部分路径）
        const dist = manhattanDistance(current.x, current.y, targetX, targetY);
        if (dist < minDist) {
            minDist = dist;
            closestNode = current;
        }

        // 探索四个方向的邻居
        const neighbors = [
            { x: 0, y: -1 },  // 上
            { x: 0, y: 1 },   // 下
            { x: -1, y: 0 },  // 左
            { x: 1, y: 0 }    // 右
        ];

        for (let dir of neighbors) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            const key = `${nx},${ny}`;

            // 检查边界和访问状态
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && !visited.has(key)) {
                // 检查是否可通行
                if (isWalkable(nx, ny)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny, parent: current });
                }
            }
        }
    }

    // 无法到达目标，返回 null
    return null;
}

/**
 * 洪水填充算法 - 计算连通区域大小
 * @param {number} startX - 起点 X 坐标
 * @param {number} startY - 起点 Y 坐标
 * @param {number} gridSize - 网格大小
 * @param {Function} isWalkable - 判断格子是否可通行的函数 (x, y) => boolean
 * @returns {number} - 连通区域的格子数量
 */
export function floodFill(startX, startY, gridSize, isWalkable) {
    const queue = [{ x: startX, y: startY }];
    const visited = new Set();
    visited.add(`${startX},${startY}`);
    let count = 0;

    while (queue.length > 0) {
        const current = queue.shift();
        count++;

        const neighbors = [
            { x: 0, y: -1 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 1, y: 0 }
        ];

        for (let dir of neighbors) {
            const nx = current.x + dir.x;
            const ny = current.y + dir.y;
            const key = `${nx},${ny}`;

            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && !visited.has(key)) {
                if (isWalkable(nx, ny)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }
    }

    return count;
}

/**
 * 重建路径（从目标节点回溯到起点）
 * @param {Object} node - 目标节点
 * @returns {Array} - 路径数组 [{x, y}, ...]
 */
function reconstructPath(node) {
    const path = [];
    let current = node;

    while (current.parent) {
        path.unshift({ x: current.x, y: current.y });
        current = current.parent;
    }

    return path;
}

/**
 * 曼哈顿距离（网格距离）
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
function manhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * 获取所有可通行的邻居格子
 * @param {number} x - 当前 X 坐标
 * @param {number} y - 当前 Y 坐标
 * @param {number} gridSize - 网格大小
 * @param {Function} isWalkable - 判断格子是否可通行的函数
 * @returns {Array} - 可通行的邻居数组 [{x, y}, ...]
 */
export function getWalkableNeighbors(x, y, gridSize, isWalkable) {
    const neighbors = [];
    const directions = [
        { x: 0, y: -1 },
        { x: 0, y: 1 },
        { x: -1, y: 0 },
        { x: 1, y: 0 }
    ];

    for (let dir of directions) {
        const nx = x + dir.x;
        const ny = y + dir.y;

        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            if (isWalkable(nx, ny)) {
                neighbors.push({ x: nx, y: ny });
            }
        }
    }

    return neighbors;
}
