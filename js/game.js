/// WASM Imports
import init, { GameOfLife, get_memory } from '../wasm-cgol/pkg/wasm_cgol.js';

/// Imports
import {
    /// Colors
    ALIVE_COLOR,
    DEAD_COLOR,
    GRID_COLOR,
    /// Canvas attributes
    Width,
    Height,
    CellSize,
    /// Canvas elements
    ctx,
    canvas,
    cellCtx,
    cellCanvas,
    gridCtx,
    gridCanvas,
    /// Functions
    updateAlpha,
    updateCellSize,
} from './uxui.js';

/// Global variables
let Gol = null;
let GolBuffer = null;

/// Set window attributes
window.updateAlpha = updateAlpha;
window.updateCellSize = updateCellSize;

/**
 * Initializes the Game of Life by loading the WebAssembly module, 
 * creating a new game instance with the specified width and height, 
 * and setting the memory GolBuffer. It then draws the initial grid and cells 
 * on the canvas.
 */
async function load() {
    await init('./wasm-cgol/pkg/wasm_cgol_bg.wasm');
    Gol = GameOfLife.new(Width, Height);
    GolBuffer = get_memory().buffer;
    drawGrid();
    drawCells();
}

/**
 * Renders the Game of Life cells to the canvas using the given `gameOfLife` instance.
 *
 * The cells are first rendered to an off-screen canvas, and then drawn to the main canvas.
 * This is done to avoid flickering, since the main canvas is cleared each time this function is called.
 *
 * @private
 */
const drawCells = () => {
    const cellsPtr = Gol.render();
    if (GolBuffer.byteLength === 0) {
        GolBuffer = get_memory().buffer;
    }
    const cells = new Uint8Array(GolBuffer, cellsPtr, Width * Height);
    console.log(cells);
    let imageData = ctx.createImageData(Width, Height);
    let data = imageData.data;
    for (let i = 0; i < cells.length; i++) {
        const idx = i * 4;
        if (cells[i]) {
            data[idx] = ALIVE_COLOR[0];     // R
            data[idx + 1] = ALIVE_COLOR[1]; // G
            data[idx + 2] = ALIVE_COLOR[2]; // B
            data[idx + 3] = ALIVE_COLOR[3]; // A
        } else {
            data[idx] = DEAD_COLOR[0];      // R
            data[idx + 1] = DEAD_COLOR[1];  // G
            data[idx + 2] = DEAD_COLOR[2];  // B
            data[idx + 3] = DEAD_COLOR[3];  // A
        }
    }
    cellCtx.putImageData(imageData, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cellCanvas, 0, 0, Width, Height, 0, 0, Width * CellSize, Height * CellSize);
    ctx.drawImage(gridCanvas, 0, 0);
};

const drawGrid = () => {
    gridCtx.beginPath();
    gridCtx.strokeStyle = GRID_COLOR;
    for (let x = 0; x <= Width; x++) {
        gridCtx.moveTo(x * CellSize + 0.5, 0);
        gridCtx.lineTo(x * CellSize + 0.5, Height * CellSize);
    }
    for (let y = 0; y <= Height; y++) {
        gridCtx.moveTo(0, y * CellSize + 0.5);
        gridCtx.lineTo(Width * CellSize, y * CellSize + 0.5);
    }
    gridCtx.stroke();
};


let animationId = null;

const isPaused = () => {
    return animationId === null;
};

const playPauseButton = document.getElementById("play-pause");
playPauseButton.addEventListener("click", event => {
    if (isPaused()) {
        play();
        event.target.textContent = "Pause";
    } else {
        pause();
        event.target.textContent = "Play";
    }
});

const play = () => {
    playPauseButton.textContent = "Pause";
    renderLoop();
};

const pause = () => {
    playPauseButton.textContent = "Play";
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
};

const renderLoop = () => {
    Gol.tick();
    drawCells();
    animationId = requestAnimationFrame(renderLoop);
};

function main() {
    updateCellSize(CellSize);
    load().catch(console.error);
}

main();