import { GameManager } from './GameManager.js';
import { Renderer } from './Renderer.js';

window.onload = () => {
    const renderer = new Renderer();
    const game = new GameManager(renderer);
    game.init();

    // Debug: Force focus and test draw
    window.focus();
    console.log("Main Loaded and Initialized");

    // Initial Render Force
    renderer.draw(game.gridSystem, game.player, game.spirit);
};
