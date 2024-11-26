import init, { GameOfLife, get_memory } from './wasm-cgol/pkg/wasm_cgol.js';

let gameOfLife = null;
let buffer = null;

async function run() {
    await init('./wasm-cgol/pkg/wasm_cgol_bg.wasm');
    gameOfLife = GameOfLife.new(WIDTH, HEIGHT);
    buffer = get_memory().buffer;

    // Initial draw to the canvas
    drawGrid(); // Cache the grid drawing
    drawCells();
}

const gridColorPicker = document.getElementById('grid-color-picker');
const deadColorPicker = document.getElementById('dead-color-picker');
const aliveColorPicker = document.getElementById('alive-color-picker');
let GRID_COLOR = gridColorPicker.value;
let DEAD_COLOR = hexToRGBA(deadColorPicker.value);
let ALIVE_COLOR = hexToRGBA(aliveColorPicker.value);
gridColorPicker.addEventListener('input', (event) => {
    GRID_COLOR = event.target.value;
    drawGrid(); // Redraw the grid with the new color
    drawCells(); // Redraw cells to refresh the canvas
});
deadColorPicker.addEventListener('input', (event) => {
    DEAD_COLOR = hexToRGBA(event.target.value);
    drawCells(); // Redraw cells with the new dead cell color
});
aliveColorPicker.addEventListener('input', (event) => {
    ALIVE_COLOR = hexToRGBA(event.target.value);
    drawCells(); // Redraw cells with the new alive cell color
});
function hexToRGBA(hex) {
    // Remove '#' if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b values
    let bigint = parseInt(hex, 16);
    let r, g, b;

    if (hex.length === 6) {
        r = (bigint >> 16) & 255;
        g = (bigint >> 8) & 255;
        b = bigint & 255;
    } else if (hex.length === 3) {
        r = ((bigint >> 8) & 15) * 17;
        g = ((bigint >> 4) & 15) * 17;
        b = (bigint & 15) * 17;
    } else {
        // Invalid format, default to black
        return [0, 0, 0, 255];
    }

    return [r, g, b, 255]; // Return RGBA array with alpha = 255
}
// const GRID_COLOR = "#000000";
// const DEAD_COLOR = [0, 0, 0, 255];    // RGBA for dead cells
// const ALIVE_COLOR = [255, 0, 0, 255]; // RGBA for alive cells
const canvasContainer = document.getElementById('canvas-container');
const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
        const newWidth = Math.floor(entry.contentRect.width / CELL_SIZE);
        const newHeight = Math.floor(entry.contentRect.height / CELL_SIZE);
        console.log(newWidth, newHeight);
        // if (newWidth !== WIDTH || newHeight !== HEIGHT) {
        //     // Update WIDTH and HEIGHT
        //     WIDTH = newWidth;
        //     HEIGHT = newHeight;

        //     // Update canvas size
        //     canvas.width = WIDTH * CELL_SIZE;
        //     canvas.height = HEIGHT * CELL_SIZE;

        //     // Update off-screen canvases
        //     gridCanvas.width = canvas.width;
        //     gridCanvas.height = canvas.height;

        //     // Reinitialize the game with new dimensions
        //     gameOfLife = GameOfLife.new(WIDTH, HEIGHT);

        //     // Redraw the grid and cells
        //     drawGrid();
        //     drawCells();
        // }
    }
});

resizeObserver.observe(canvasContainer);

const CELL_SIZE = 5; // pixels
let WIDTH = 512;
let HEIGHT = 256;

const canvas = document.getElementById("game-of-life-canvas");
canvas.width = CELL_SIZE * WIDTH;
canvas.height = CELL_SIZE * HEIGHT;
const ctx = canvas.getContext('2d');

// Create an off-screen canvas for the grid
const gridCanvas = document.createElement('canvas');
gridCanvas.width = canvas.width;
gridCanvas.height = canvas.height;
const gridCtx = gridCanvas.getContext('2d');

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
    gameOfLife.tick();
    drawCells();
    animationId = requestAnimationFrame(renderLoop);
};

const drawGrid = () => {
    gridCtx.beginPath();
    gridCtx.strokeStyle = GRID_COLOR;

    for (let x = 0; x <= WIDTH; x++) {
        gridCtx.moveTo(x * CELL_SIZE + 0.5, 0);
        gridCtx.lineTo(x * CELL_SIZE + 0.5, HEIGHT * CELL_SIZE);
    }

    for (let y = 0; y <= HEIGHT; y++) {
        gridCtx.moveTo(0, y * CELL_SIZE + 0.5);
        gridCtx.lineTo(WIDTH * CELL_SIZE, y * CELL_SIZE + 0.5);
    }

    gridCtx.stroke();
};

const drawCells = () => {
    const cellsPtr = gameOfLife.render();
    if (buffer.byteLength === 0) {
        buffer = get_memory().buffer;
    }
    const cells = new Uint8Array(buffer, cellsPtr, WIDTH * HEIGHT);

    // Create ImageData object
    let imageData = ctx.createImageData(WIDTH, HEIGHT);
    let data = imageData.data;

    for (let i = 0; i < cells.length; i++) {
        const idx = i * 4;
        if (cells[i]) {
            data[idx] = ALIVE_COLOR[0];     // R
            data[idx + 1] = ALIVE_COLOR[1]; // G
            data[idx + 2] = ALIVE_COLOR[2]; // B
            data[idx + 3] = ALIVE_COLOR[3]; // A
        } else {
            data[idx] = DEAD_COLOR[0];
            data[idx + 1] = DEAD_COLOR[1];
            data[idx + 2] = DEAD_COLOR[2];
            data[idx + 3] = DEAD_COLOR[3];
        }
    }

    // Scale up the ImageData to match CELL_SIZE
    let offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = WIDTH;
    offscreenCanvas.height = HEIGHT;
    let offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.putImageData(imageData, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the cells scaled to CELL_SIZE
    ctx.drawImage(offscreenCanvas, 0, 0, WIDTH, HEIGHT, 0, 0, WIDTH * CELL_SIZE, HEIGHT * CELL_SIZE);

    // Draw the cached grid over the cells
    ctx.drawImage(gridCanvas, 0, 0);
};

// Variables to track mouse state
let isDrawing = false;

const getCanvasCoordinates = (event) => {
    const boundingRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;
    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;
    const col = Math.floor(canvasLeft / CELL_SIZE);
    const row = Math.floor(canvasTop / CELL_SIZE);
    return { row, col };
};

// Mouse event handlers
canvas.addEventListener("mousedown", event => {
    isDrawing = true;
    const { row, col } = getCanvasCoordinates(event);
    gameOfLife.toggle_cell(row, col);
    drawCells();
});

canvas.addEventListener("mouseup", event => {
    isDrawing = false;
});

canvas.addEventListener("mousemove", event => {
    if (isDrawing) {
        const { row, col } = getCanvasCoordinates(event);
        gameOfLife.toggle_cell(row, col);
        drawCells();
    }
});

canvas.addEventListener("touchstart", event => event.preventDefault());

canvas.addEventListener("touchmove", event => event.preventDefault());

run().catch(console.error);
