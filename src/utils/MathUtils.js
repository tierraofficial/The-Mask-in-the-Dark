/**
 * MathUtils - 通用数学工具函数
 */

/**
 * 曼哈顿距离（网格距离）
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function manhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * 欧几里得距离
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function euclideanDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 线性插值
 * @param {number} start - 起始值
 * @param {number} end - 结束值
 * @param {number} t - 插值因子 (0-1)
 * @returns {number}
 */
export function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * 限制数值在范围内
 * @param {number} value - 要限制的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number}
 */
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * 将角度标准化到 0-2π 范围
 * @param {number} angle - 角度（弧度）
 * @returns {number}
 */
export function normalizeAngle(angle) {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
}

/**
 * 角度转弧度
 * @param {number} degrees 
 * @returns {number}
 */
export function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * 弧度转角度
 * @param {number} radians 
 * @returns {number}
 */
export function radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
}

/**
 * 随机整数（包含 min 和 max）
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机浮点数
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function randomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * 从数组中随机选择一个元素
 * @param {Array} array 
 * @returns {*}
 */
export function randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}

/**
 * 2D 向量点积
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function dot2D(x1, y1, x2, y2) {
    return x1 * x2 + y1 * y2;
}

/**
 * 2D 向量叉积（返回标量）
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function cross2D(x1, y1, x2, y2) {
    return x1 * y2 - y1 * x2;
}

/**
 * 2D 向量归一化
 * @param {number} x 
 * @param {number} y 
 * @returns {{x: number, y: number}}
 */
export function normalize2D(x, y) {
    const length = Math.sqrt(x * x + y * y);
    if (length === 0) return { x: 0, y: 0 };
    return { x: x / length, y: y / length };
}

/**
 * 旋转 2D 向量
 * @param {number} x 
 * @param {number} y 
 * @param {number} angle - 旋转角度（弧度）
 * @returns {{x: number, y: number}}
 */
export function rotate2D(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return {
        x: x * cos - y * sin,
        y: x * sin + y * cos
    };
}

/**
 * 平滑步进函数（Smoothstep）
 * @param {number} edge0 
 * @param {number} edge1 
 * @param {number} x 
 * @returns {number}
 */
export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * 检查数值是否接近（用于浮点数比较）
 * @param {number} a 
 * @param {number} b 
 * @param {number} epsilon - 误差范围，默认 0.0001
 * @returns {boolean}
 */
export function approximately(a, b, epsilon = 0.0001) {
    return Math.abs(a - b) < epsilon;
}
