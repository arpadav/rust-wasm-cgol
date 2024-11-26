
/// Color of alive cells
export let ALIVE_COLOR = [1, 0, 0, 1];
const aliveColorPicker = document.getElementById('alive-color-picker');
aliveColorPicker.addEventListener('input', (event) => {
    setRgb(ALIVE_COLOR, hex2rgb(event.target.value));
})

/// Color of dead cells
export let DEAD_COLOR = [0, 0, 0, 1];
const deadColorPicker = document.getElementById('dead-color-picker');
deadColorPicker.addEventListener('input', (event) => {
    setRgb(DEAD_COLOR, hex2rgb(event.target.value));
})

/// Color of the grid
export let GRID_COLOR = [0, 0, 0, 1];
const gridColorPicker = document.getElementById('grid-color-picker');
gridColorPicker.addEventListener('input', (event) => {
    setRgb(GRID_COLOR, hex2rgb(event.target.value));
});

/// Canvas
export let Width = 500;
export let Height = 500;
// const canvasContainer = document.getElementById('canvas-container');
// const resizeObserver = new ResizeObserver(entries => {
//     for (let entry of entries) {
//         const newWidth = Math.floor(entry.contentRect.width / CellSize);
//         const newHeight = Math.floor(entry.contentRect.height / CellSize);
//         console.log(newWidth, newHeight);
//         // if (newWidth !== Width || newHeight !== Height) {
//         //     // Update Width and Height
//         //     Width = newWidth;
//         //     Height = newHeight;

//         //     // Update canvas size
//         //     canvas.width = Width * CellSize;
//         //     canvas.height = Height * CellSize;

//         //     // Update off-screen canvases
//         //     gridCanvas.width = canvas.width;
//         //     gridCanvas.height = canvas.height;

//         //     // Reinitialize the game with new dimensions
//         //     gameOfLife = GameOfLife.new(Width, Height);

//         //     // Redraw the grid and cells
//         //     drawGrid();
//         //     drawCells();
//         // }
//     }
// });
// resizeObserver.observe(canvasContainer);

/// Canvas for everything
export const canvas = document.getElementById("game-of-life-canvas");
export const ctx = canvas.getContext('2d');

/// Canvas for drawing pixels
export const cellCanvas = document.createElement('canvas');
export const cellCtx = cellCanvas.getContext('2d');

/// Canvas for drawing the grid
export const gridCanvas = document.createElement('canvas');
export const gridCtx = gridCanvas.getContext('2d');

/// Cell size
export let CellSize = 2; // pixels

/**
 * Updates the alpha channel of the given color.
 *
 * @param {number} alpha - New alpha value. Must be between 0 and 1.
 * @param {string} which - Which color to update. Must be one of "grid", "dead", or
 *     "alive".
 */
export function updateAlpha(alpha, which) {
    switch (which) {
        case "grid":
            setAlpha(GRID_COLOR, alpha2range(alpha));
            break;
        case "dead":
            setAlpha(DEAD_COLOR, alpha2range(alpha));
            break;
        case "alive":
            setAlpha(ALIVE_COLOR, alpha2range(alpha));
            break;
    }
}

/**
 * Updates the size of each cell in the Game of Life canvas.
 *
 * @param {number} size - New size of each cell. Must be a positive integer.
 */
export function updateCellSize(size) {
    CellSize = size;
    canvas.width = CellSize * Width;
    canvas.height = CellSize * Height;
    cellCanvas.width = canvas.width;
    cellCanvas.height = canvas.height;
    gridCanvas.width = canvas.width;
    gridCanvas.height = canvas.height;
}

/**
 * Copies the first 3 elements of `rgb` into `rgba`.
 *
 * @param {number[]} rgba - Array to modify. Must have length 4.
 * @param {number[]} rgb - Array to copy from. Must have length 3.
 */
function setRgb(rgba, rgb) {
    rgba[0] = rgb[0];
    rgba[1] = rgb[1];
    rgba[2] = rgb[2];
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
