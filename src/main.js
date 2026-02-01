import { GameManager } from './GameManager.js';
import { Renderer } from './Renderer.js';
import { Raycaster } from './Raycaster.js';
import { ScreenManager } from './ScreenManager.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';

window.onload = () => {
    // 1. Core Systems
    const renderer = new Renderer();
    const uiManager = new UIManager(); // Create UIManager explicitly
    const audioManager = new AudioManager();

    // 2. Game Logic (But don't start loop yet)
    const game = new GameManager(renderer, audioManager);
    // Note: game.init() calls gridSystem.init(), which we needed for Raycaster.
    // However, since we want ScreenManager to handle the "Start", we can either let it run 
    // or manually init gridSystem just for Raycaster setup.
    // game.init() starts the loop requestAnimationFrame.
    // We want to PAUSE that or defer it.
    // Let's rely on ScreenManager.showGameScreen -> game.reset() -> game.init().
    // BUT Raycaster needs gridSystem NOW.
    game.gridSystem.init(); // Just init data, don't start game loop

    // 3. UI Flow Manager
    const screenManager = new ScreenManager(renderer, uiManager);

    // 4. 3D Raycaster
    const raycaster = new Raycaster('raycaster-canvas');
    raycaster.init(game.gridSystem);

    // 5. Connect Everything
    game.setRaycaster(raycaster);
    game.setScreenManager(screenManager);
    screenManager.setGameManager(game);

    // 6. Force Game into "GameOver" state so ScreenManager resets it on first play
    game.gameOver = true;

    // 7. Start UI Flow (Shows Start Screen)
    screenManager.init();

    // 8. Debug / Layout Fix
    // Ensure Raycaster canvas behaves (resize)
    window.addEventListener('resize', () => {
        raycaster.resize();
    });

    console.log("Main Loaded - ScreenManager Initialized (Split View)");
};
