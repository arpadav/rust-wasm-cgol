/// WASM Imports
import init, { GameOfLife, get_memory } from './wasm-cgol/pkg/wasm_cgol.js';

/// Game-of-life object
let Gol = null;
/// Game-of-life buffer of cell data (vector of bools)
let GolBuffer = null;
/// Color of alive cells
let AliveColor = [1, 1, 0, 1].map((x) => x * 255);
/// Color of dead cells
let DeadColor = [0, 0, 0, 1].map((x) => x * 255);
/// Color of the grid
let GridColor = [0, 0, 0, 1].map((x) => x * 255);
/// Cell size, in pixels
let CellSize = 3;
/// Canvas width
let Width = 360;
let pxWidth = Width * CellSize;
let magicWidthOffset = 0;
let initialResizeCanvasWidth = null;
/// Canvas height
let Height = 360;
let pxHeight = Height * CellSize;
let magicHeightOffset = 0;
let initialResizeCanvasHeight = null;
/// Grid enabled
let gridEnabled = true;
/// Playing / paused
let animationId = null;
// Variables to track mouse state
let isDrawing = false;
/// loading from bin
let loadingBin = false;

/// Set window attributes
window.updateAlpha = updateAlpha;
window.updateCellSize = updateCellSize;

/// Canvas for everything
const canvas = document.getElementById("game-of-life-canvas");
const ctx = canvas.getContext('2d');
/// Canvas for drawing cells
const cellCanvas = document.createElement('canvas');
const cellCtx = cellCanvas.getContext('2d');
/// Canvas for drawing the grid
const gridCanvas = document.createElement('canvas');
const gridCtx = gridCanvas.getContext('2d');

/// Alive-color listener
const aliveOpacity = document.getElementById('alive-opacity');
const aliveColorPicker = document.getElementById('alive-color-picker');
aliveColorPicker.value = rgba2hex(AliveColor);
aliveColorPicker.addEventListener('input', (event) => {
    setRgb(AliveColor, hex2rgb(event.target.value));
    drawCells();
})
/// Dead-color listener
const deadOpacity = document.getElementById('dead-opacity');
const deadColorPicker = document.getElementById('dead-color-picker');
deadColorPicker.value = rgba2hex(DeadColor);
deadColorPicker.addEventListener('input', (event) => {
    setRgb(DeadColor, hex2rgb(event.target.value));
    drawCells();
})
/// Grid-color listener
const gridColorPicker = document.getElementById('grid-color-picker');
gridColorPicker.value = rgba2hex(GridColor);
gridColorPicker.addEventListener('input', (event) => {
    setRgb(GridColor, hex2rgb(event.target.value));
    if (gridEnabled) drawGrid();
})
/// Grid enabled listener
const gridEnabledCheckbox = document.getElementById('grid-enabled');
gridEnabledCheckbox.checked = gridEnabled;
gridEnabledCheckbox.addEventListener('change', (event) => {
    gridEnabled = event.target.checked;
    render();
})
/// Cell-size listener
const cellSizeSlider = document.getElementById('cell-size');

/// Play-pause listener
const playPauseButton = document.getElementById("play-pause");
playPauseButton.addEventListener("click", event => {
    if (isPaused()) {
        play();
        event.target.textContent = "Pause";
        stepButton.disabled = true;
    } else {
        pause();
        event.target.textContent = "Play";
        stepButton.disabled = false;
    }
});
/// Step listener
const stepButton = document.getElementById("step");
stepButton.addEventListener("click", _ => { step(); });

/// Export listener
const exportButton = document.getElementById("export-button");
exportButton.addEventListener("click", _ => {
    const cells = new Uint8Array(GolBuffer, Gol.ptr(), Width * Height);
    const additionalAttributes = {
        width: Width,
        height: Height,
        cellSize: CellSize,
        aliveColor: AliveColor,
        deadColor: DeadColor,
        gridColor: GridColor,
        gridEnabled: gridEnabled
    };
    const attrBuffer = serializeAttributes(additionalAttributes);
    const combinedBuffer = new Uint8Array(attrBuffer.byteLength + cells.byteLength);
    combinedBuffer.set(new Uint8Array(attrBuffer), 0);
    combinedBuffer.set(cells, attrBuffer.byteLength);
    const blob = new Blob([combinedBuffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "game-of-life.bin";
    a.click();
    URL.revokeObjectURL(url);
});

/// Import listener
const importInput = document.getElementById("import-button");
importInput.addEventListener("change", async event => {
    loadingBin = true;
    const file = event.target.files[0];
    if (!file) return
    const reader = new FileReader();
    reader.onload = async function(e) {
        const arrayBuffer = e.target.result;
        const totalData = new Uint8Array(arrayBuffer);
        const attrSize = 4 * 16; // length of `attrArray` in `serializeAttributes`
        const cellsData = totalData.slice(attrSize);
        const attributes = totalData.slice(0, attrSize).buffer;
        const dattrs = deserializeAttributes(attributes);
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                setAttributes(dattrs);
                updateCanvasSize();
                canvasContainer.style.width = `${dattrs.cellSize * dattrs.width + 10}px`;
                canvasContainer.style.height = `${dattrs.cellSize * dattrs.height + 10}px`;
                Gol = GameOfLife.load(Width, Height, cellsData);
                GolBuffer = get_memory().buffer;
                requestAnimationFrame(() => {
                    getGrid();
                    getCells();
                    requestAnimationFrame(() => {
                        render();
                        requestAnimationFrame(() => {
                            loadingBin = false;
                            resolve();
                        });
                    });
                });
            });
        });
    };
    reader.readAsArrayBuffer(file);
});

/// Mouse-down event handler
canvas.addEventListener("mousedown", event => {
    isDrawing = true;
    const { row, col } = getCanvasCoordinates(event);
    Gol.toggle_cell(row, col);
    drawCells();
});
/// Mouse-up event handler
canvas.addEventListener("mouseup", _ => {
    isDrawing = false;
});
/// Mouse-move event handler
canvas.addEventListener("mousemove", event => {
    if (isDrawing) {
        const { row, col } = getCanvasCoordinates(event);
        Gol.toggle_cell(row, col);
        drawCells();
    }
});
/// Touch-start event handler
canvas.addEventListener("touchstart", event => event.preventDefault());
/// Touch-move event handler
canvas.addEventListener("touchmove", event => event.preventDefault());

/// Canvas re-size event handler
const canvasContainer = document.getElementById('canvas-container');
const resizePercentTolerance = 0;
const resizePixelTolerance = 0;
const resizeObserver = new ResizeObserver(entries => {
    if (loadingBin) return
    for (let entry of entries) {
        const { width, height } = entry.contentRect;
        if (initialResizeCanvasWidth === null && initialResizeCanvasHeight === null) {
            initialResizeCanvasWidth = width;
            initialResizeCanvasHeight = height;
            magicWidthOffset = width - canvas.width;
            magicHeightOffset = height - canvas.height;
        }
        const newWidth = Math.floor((width - magicWidthOffset) / CellSize);
        const newHeight = Math.floor((height - magicHeightOffset) / CellSize);
        const diffWidth = Math.abs(newWidth - Width);
        const diffHeight = Math.abs(newHeight - Height);
        if (
            (diffWidth / Width) > resizePercentTolerance
            || diffWidth > resizePixelTolerance
            || (diffHeight / Height) > resizePercentTolerance
            || diffHeight > resizePixelTolerance
        ) {
            Width = newWidth;
            Height = newHeight;
            pxWidth = Width * CellSize;
            pxHeight = Height * CellSize;
            updateCanvasSize();
            newGame();
        }
    }
});
resizeObserver.observe(canvasContainer);

/**
 * Initializes the Game of Life by loading the WASM module, 
 * creating a new game.
 */
async function load() {
    await init('./wasm-cgol/pkg/wasm_cgol_bg.wasm');
    newGame();
}

/**
 * Creates a new Game of Life instance with the current Width and Height, 
 * filling the grid randomly and rendering result onto the screen.
 */
function newGame() {
    Gol = GameOfLife.new(Width, Height);
    GolBuffer = get_memory().buffer;
    getGrid();
    getCells();
    render();
}

/**
 * Renders the Game of Life cells to the `cellCanvas` using the given `Gol` WASM
 * instance.
 */
const getCells = () => {
    if (GolBuffer.byteLength === 0) GolBuffer = get_memory().buffer
    const cells = new Uint8Array(GolBuffer, Gol.ptr(), Width * Height);
    let imageData = ctx.createImageData(Width, Height);
    let canvasData = imageData.data;
    for (let i = 0; i < cells.length; i++) {
        const idx = i * 4;
        if (cells[i]) {
            canvasData[idx] = AliveColor[0];     // R
            canvasData[idx + 1] = AliveColor[1]; // G
            canvasData[idx + 2] = AliveColor[2]; // B
            canvasData[idx + 3] = AliveColor[3]; // A
        } else {
            canvasData[idx] = DeadColor[0];      // R
            canvasData[idx + 1] = DeadColor[1];  // G
            canvasData[idx + 2] = DeadColor[2];  // B
            canvasData[idx + 3] = DeadColor[3];  // A
        }
    }
    cellCtx.putImageData(imageData, 0, 0);
};

/**
 * Renders the grid to the `gridCanvas`.
 */
const getGrid = () => {
    gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    gridCtx.beginPath();
    gridCtx.strokeStyle = rgba2hex(GridColor);
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

/**
 * Updates the Game of Life cells and redraws the canvas.
 */
const drawCells = () => {
    getCells();
    render();
};

/**
 * Redraws the grid.
 */
const drawGrid = () => {
    getGrid();
    render();
}

/**
 * Redraws the canvas by clearing the canvas, pasting the `cellCanvas`, and
 * if `gridEnabled`, pasting the `gridCanvas`.
 */
const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cellCanvas, 0, 0, Width, Height, 0, 0, Width * CellSize, Height * CellSize);
    if (gridEnabled) ctx.drawImage(gridCanvas, 0, 0);
}

/**
 * Checks if the animation is currently paused.
 *
 * @returns {boolean} True if the animation is paused, false otherwise.
 */
const isPaused = () => {
    return animationId === null;
};

/**
 * Starts the animation by changing the button text to "Pause" 
 * and initiating the render loop.
 */
const play = () => {
    playPauseButton.textContent = "Pause";
    renderLoop();
};

/**
 * Pauses the animation by changing the button text to "Play" and 
 * cancelling the animation frame, if it is currently active.
 */
const pause = () => {
    playPauseButton.textContent = "Play";
    if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
};

/**
 * Continuously updates the game state and redraws the canvas.
 * 
 * This function calls `Gol.tick()` to progress the game state by one tick,
 * and `render()` to render the current state. It then requests the next
 * animation frame to keep the loop running, storing its ID in `animationId`.
 */
const renderLoop = () => {
    step();
    animationId = requestAnimationFrame(renderLoop);
};

/**
 * Advances the Game of Life by one tick and redraws the cells.
 *
 * Calls `Gol.tick()` to update the game state and `drawCells()` to render the new state.
 */
const step = () => {
    Gol.tick();
    drawCells();
}

/**
 * Converts a mouse event coordinate into a coordinate on the canvas.
 *
 * The event is expected to be a MouseEvent or a TouchEvent. The function
 * returns an object with two properties, row and col, which represent the
 * coordinates on the canvas.
 *
 * @param {MouseEvent|TouchEvent} event - The event with the coordinates to
 *     convert.
 * @returns {Object} An object with two properties, row and col, which represent
 *     the coordinates on the canvas.
 */
const getCanvasCoordinates = (event) => {
    const boundingRect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / boundingRect.width;
    const scaleY = canvas.height / boundingRect.height;
    const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
    const canvasTop = (event.clientY - boundingRect.top) * scaleY;
    const col = Math.floor(canvasLeft / CellSize);
    const row = Math.floor(canvasTop / CellSize);
    return { row, col };
};

/**
 * Updates the alpha channel of the given color.
 *
 * @param {number} alpha - New alpha value. Must be between 0 and 1.
 * @param {string} which - Which color to update. Must be one of "grid", "dead", or
 *     "alive".
 */
function updateAlpha(alpha, which) {
    switch (which) {
        case "grid":
            setAlpha(GridColor, alpha2range(alpha));
            drawGrid();
            break;
        case "dead":
            setAlpha(DeadColor, alpha2range(alpha));
            drawCells();
            break;
        case "alive":
            setAlpha(AliveColor, alpha2range(alpha));
            drawCells();
            break;
    }
}

/**
 * Updates the cell size, and each canvas dim.
 *
 * @param {number} size - New size of each cell. Must be a positive integer.
 */
function updateCellSize(size) {
    CellSize = size;
    Width = Math.round(pxWidth - magicWidthOffset) / CellSize;
    Height = Math.round(pxHeight - magicHeightOffset) / CellSize;
    newGame();
}

/**
 * Updates the dimensions of each canvas element.
 */
function updateCanvasSize() {
    canvas.width = pxWidth;
    canvas.height = pxHeight;
    cellCanvas.width = pxWidth;
    cellCanvas.height = pxHeight;
    gridCanvas.width = pxWidth;
    gridCanvas.height = pxHeight;
}

/**
 * Copies the first 3 elements of `rgb` into `rgba`.
 *
 * @param {number[]} rgba - Array to modify. Must have length 4.
 * @param {number[]} rgb - Array to copy from. Must have length 3.
 */
function setRgb(rgba, rgb) {
    rgba[0] = rgb.r;
    rgba[1] = rgb.g;
    rgba[2] = rgb.b;
}

/**
 * Copies the single element of `alpha` into the 4th element of `rgba`.
 *
 * @param {number[]} rgba - Array to modify. Must have length 4.
 * @param {number} alpha - Value to copy from.
 */
function setAlpha(rgba, alpha) {
    rgba[3] = alpha;
}

/**
 * Maps a value from the range [0, 1] to the range [0, 255].
 *
 * @param {number} alpha - Value to map. Must be between 0 and 1.
 * @returns {number} Mapped value.
 */
function alpha2range(alpha) {
    return alpha * 255;
}

/**
 * Converts a color given in hexadecimal format to an object with properties
 * r, g, and b, each representing the red, green, and blue components of the
 * color.
 *
 * @param {string} hex - Color in hexadecimal format. May be optionally
 *     prefixed with '#'.
 * @returns {{r: number, g: number, b: number}} Object with properties r, g,
 *     and b, each representing the red, green, and blue components of the
 *     color. If the input is invalid, this function will return null.
 */
function hex2rgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Converts an array of four numbers representing a color in RGBA format to a
 * string in hexadecimal format.
 *
 * @param {number[]} rgba - Array of four numbers representing a color in RGBA
 *     format. The first three elements represent the red, green, and blue
 *     components of the color, and the fourth element is the alpha component.
 *     All elements must be between 0 and 255.
 * @returns {string} The color in hexadecimal format. If the input is invalid,
 *     this function will return null.
 */
function rgba2hex(rgba) {
    return "#" + ((1 << 24) + (rgba[0] << 16) + (rgba[1] << 8) + rgba[2]).toString(16).slice(1);
}

/**
 * Serializes the given object of attributes into a binary format.
 *
 * The binary format is as follows:
 *   - The first 4 bytes represent the width of the game board.
 *   - The second 4 bytes represent the height of the game board.
 *   - The third 4 bytes represent the cell size.
 *   - The fourth 4 bytes represent the grid enabled flag.
 *   - The fifth, sixth, seventh, and eighth 4 bytes represent the red, green,
 *     blue, and alpha components of the alive cell color, respectively.
 *   - The ninth, tenth, eleventh, and twelfth 4 bytes represent the red,
 *     green, blue, and alpha components of the dead cell color, respectively.
 *   - The thirteenth, fourteenth, and fifteenth 4 bytes represent the red,
 *     green, and blue components of the grid color, respectively.
 *
 * @param {Object} attrs - Object containing the attributes to serialize.
 *     Must have the following properties:
 *       - width: {number} Width of the game board.
 *       - height: {number} Height of the game board.
 *       - cellSize: {number} Size of each cell in the game board.
 *       - gridEnabled: {boolean} Whether the grid is enabled.
 *       - aliveColor: {number[]} RGBA color of alive cells.
 *       - deadColor: {number[]} RGBA color of dead cells.
 *       - gridColor: {number[]} RGB color of the grid.
 * @returns {ArrayBuffer} Serialized binary representation of the attributes.
 */
function serializeAttributes(attrs) {
    const attrArray = [
        attrs.width,
        attrs.height,
        attrs.cellSize,
        attrs.gridEnabled,
        attrs.aliveColor[0],
        attrs.aliveColor[1],
        attrs.aliveColor[2],
        attrs.aliveColor[3],
        attrs.deadColor[0],
        attrs.deadColor[1],
        attrs.deadColor[2],
        attrs.deadColor[3],
        attrs.gridColor[0],
        attrs.gridColor[1],
        attrs.gridColor[2],
        attrs.gridColor[3],
    ];
    const buffer = new ArrayBuffer(attrArray.length * 4);
    const view = new DataView(buffer);
    attrArray.forEach((attr, index) => {
        view.setUint32(index * 4, attr, true);
    });
    return buffer;
}

/**
 * Deserializes the given binary representation of attributes into an object.
 *
 * The binary format is as follows:
 *   - The first 4 bytes represent the width of the game board.
 *   - The second 4 bytes represent the height of the game board.
 *   - The third 4 bytes represent the cell size.
 *   - The fourth 4 bytes represent the grid enabled flag.
 *   - The fifth, sixth, seventh, and eighth 4 bytes represent the red, green,
 *     blue, and alpha components of the alive cell color, respectively.
 *   - The ninth, tenth, eleventh, and twelfth 4 bytes represent the red,
 *     green, blue, and alpha components of the dead cell color, respectively.
 *   - The thirteenth, fourteenth, and fifteenth 4 bytes represent the red,
 *     green, and blue components of the grid color, respectively.
 *
 * @param {ArrayBuffer} buffer - Binary representation of the attributes.
 * @returns {Object} Deserialized object with the following properties:
 *     - width: {number} Width of the game board.
 *     - height: {number} Height of the game board.
 *     - cellSize: {number} Size of each cell in the game board.
 *     - gridEnabled: {boolean} Whether the grid is enabled.
 *     - aliveColor: {number[]} RGBA color of alive cells.
 *     - deadColor: {number[]} RGBA color of dead cells.
 *     - gridColor: {number[]} RGB color of the grid.
 */
function deserializeAttributes(buffer) {
    const view = new DataView(buffer);
    const attributes = {
        width: view.getUint32(0, true),
        height: view.getUint32(4, true),
        cellSize: view.getUint32(8, true),
        gridEnabled: view.getUint32(12, true),
        aliveColor: [view.getUint32(16, true), view.getUint32(20, true), view.getUint32(24, true), view.getUint32(28, true)],
        deadColor: [view.getUint32(32, true), view.getUint32(36, true), view.getUint32(40, true), view.getUint32(44, true)],
        gridColor: [view.getUint32(48, true), view.getUint32(52, true), view.getUint32(56, true), view.getUint32(60, true)],
    };
    return attributes;
}

/**
 * Sets the attributes of the game based on the given object.
 *
 * @param {Object} attrs - Object with the following properties:
 *     - width: {number} Width of the game board.
 *     - height: {number} Height of the game board.
 *     - cellSize: {number} Size of each cell in the game board.
 *     - gridEnabled: {boolean} Whether the grid is enabled.
 *     - aliveColor: {number[]} RGBA color of alive cells.
 *     - deadColor: {number[]} RGBA color of dead cells.
 *     - gridColor: {number[]} RGB color of the grid.
 */
function setAttributes(attrs) {
    Width = attrs.width;
    Height = attrs.height;
    CellSize = attrs.cellSize;
    cellSizeSlider.value = CellSize;
    pxWidth = Width * CellSize;
    pxHeight = Height * CellSize;
    gridEnabled = attrs.gridEnabled;
    gridEnabledCheckbox.checked = gridEnabled;
    AliveColor = attrs.aliveColor;
    aliveColorPicker.value = rgba2hex(AliveColor);
    aliveOpacity.value = AliveColor[3] / 255;
    DeadColor = attrs.deadColor;
    deadColorPicker.value = rgba2hex(DeadColor);
    deadOpacity.value = DeadColor[3] / 255;
    GridColor = attrs.gridColor;
    gridColorPicker.value = rgba2hex(GridColor);
}

/**
 * Main!
 */
function main() {
    updateCanvasSize();
    load().catch(console.error);
}
main();