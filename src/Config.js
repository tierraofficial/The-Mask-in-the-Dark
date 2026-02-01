// =========================================
// 游戏核心配置 (Game Configuration)
// =========================================

export const GRID_SIZE = 5;       // 网格大小 (5x5)
export const TILE_SIZE = 120;     // 单个格子像素宽 (600px / 5)

// 视觉与动画
export const ANIMATION_SPEED = 0.04; // 动画渐变速度 (越小越慢，模拟老式LCD残影)

// 颜色定义 (Warm Retro Palette)
export const COLORS = {
    BG: '#101010',        // 背景色 (深暖黑)
    OFF: '#2a2a2a',       // 熄灭灯光 (深灰)
    ON: '#fdfdca',        // 点亮灯光 (暖白，老式灯泡感)

    // UI 覆盖层
    PLAYER: '#fffacd',    // 玩家光标颜色 (亮柠檬黄)
    SPIRIT: '#ff4444',    // 恶灵颜色 (复古红)
    HIGHLIGHT: 'rgba(255, 255, 200, 0.1)', // 高亮提示
    CORRUPT: '#ff0000'    // 破坏/腐蚀效果颜色
};

// =========================================
// 游戏规则配置 (Game Rules)
// =========================================

export const GAME_SETTINGS = {
    // 玩家设置
    PLAYER_START: { x: 2, y: 2 }, // 玩家出生点 (中心)

    // 恶灵设置
    SPIRIT_HP: 3,                 // 恶灵生命值 (被光照几次后驱逐)
    TRAP_THRESHOLD: 5,            // 困兽阈值 (如果连通暗区小于此值，视为被困，触发破坏)

    // 回合设置
    TURN_TIME_LIMIT: 2000,        // 回合限时 (毫秒)

    // 关卡生成
    LIGHT_CHANCE: 0.5,            // 初始亮灯概率
    SPAWN_ATTEMPTS: 100,          // 恶灵生成位置尝试次数 (防止死循环)

    // 行动点
    PLAYER_AP: 1,                 // 玩家每回合行动点数

    // 显形技能
    SPIRIT_REVEAL_LIMIT: 3,       // 每局使用次数限制
    SPIRIT_REVEAL_DURATION: 500,  // 显形持续时间 (毫秒)

    // 惩罚设置
    IDLE_PENALTY_LIGHTS: 3        // 待机惩罚熄灭灯及数量
};
