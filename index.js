import init, { GameOfLife, get_memory } from './wasm-cgol/pkg/wasm_cgol.js';

let gameOfLife = null;
let buffer = null;

async function run() {
    await init('./wasm-cgol/pkg/wasm_cgol_bg.wasm');
    gameOfLife = GameOfLife.new(WIDTH, HEIGHT);
    buffer = get_memory().buffer
    
    // Initial draw to the canvas
    drawGrid();
    drawCells();
}

const CELL_SIZE = 2; // pixels
const GRID_COLOR = "#000000";
const DEAD_COLOR = "#000000";
const ALIVE_COLOR = "#FF0000";
const WIDTH = 256;
const HEIGHT = 256;

const canvas = document.getElementById("game-of-life-canvas");
canvas.height = (CELL_SIZE + 1) * HEIGHT + 1;
canvas.width = (CELL_SIZE + 1) * WIDTH + 1;
const ctx = canvas.getContext('2d');

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

    drawGrid();
    drawCells();

    // // sleep for SLEEP_TIME milliseconds
    // setTimeout(() => {
    //     animationId = requestAnimationFrame(renderLoop);
    // }, SLEEP_TIME);

    animationId = requestAnimationFrame(renderLoop);
};

const getIndex = (row, column) => {
    return row * WIDTH + column;
};

const drawGrid = () => {
    ctx.beginPath();
    ctx.strokeStyle = GRID_COLOR;

    // Vertical lines.
    for (let i = 0; i <= WIDTH; i++) {
        ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
        ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * HEIGHT + 1);
    }

    // Horizontal lines.
    for (let j = 0; j <= HEIGHT; j++) {
        ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
        ctx.lineTo((CELL_SIZE + 1) * WIDTH + 1, j * (CELL_SIZE + 1) + 1);
    }

    ctx.stroke();
};

const drawCells = () => {
    const cellsPtr = gameOfLife.render();
    if (buffer.byteLength === 0) {
        buffer = get_memory().buffer;
    }
    const cells = new Uint8Array(buffer, cellsPtr, WIDTH * HEIGHT);

    ctx.beginPath();

    for (let row = 0; row < HEIGHT; row++) {
        for (let col = 0; col < WIDTH; col++) {
            const idx = getIndex(row, col);

            ctx.fillStyle = cells[idx] ? ALIVE_COLOR : DEAD_COLOR;
            ctx.fillRect(
                col * (CELL_SIZE + 1) + 1,
                row * (CELL_SIZE + 1) + 1,
                CELL_SIZE,
                CELL_SIZE
            );
        }
    }

    ctx.stroke();
};

// Mouse event handlers
canvas.addEventListener("click", event => {

    // console log "here"
    console.log("here");

    const boundingRect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;

    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;

    const row = canvas.height - Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), HEIGHT - 1);
    const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), WIDTH - 1);

    gameOfLife.toggle_cell(row, col);

    drawGrid();
    drawCells();
});

run().catch(console.error);