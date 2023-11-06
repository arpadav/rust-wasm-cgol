use web_sys::console;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct GameOfLife {
    cells: Vec<bool>,
    pub width: usize,
    pub height: usize,
}

#[wasm_bindgen]
impl GameOfLife {
    pub fn new(w: usize, h: usize) -> GameOfLife {
        let mut cells: Vec<bool> = (0..w * h).map(|_| false).collect();
        // fill randomly with 1
        for cell in cells.iter_mut() {
            *cell = js_sys::Math::random() < 0.5;
        }
        GameOfLife { cells: cells, width: w, height: h}
    }

    pub fn size(&self) -> usize {
        self.width * self.height
    }

    pub fn render(&self) -> *const bool {
        let ptr = self.cells.as_ptr();
        std::mem::forget(&self.cells);
        ptr
    }

    pub fn tick(&mut self) {
        let mut next = self.cells.clone();

        for y in 0..self.height {
            for x in 0..self.width {
                let idx = self.get_index(x, y);
                let cell = self.cells[idx];
                let live_neighbors = self.live_neighbor_count(x, y);

                let next_cell = match (cell, live_neighbors) {
                    (true, x) if x < 2 => false,
                    (true, 2) | (true, 3) => true,
                    (true, x) if x > 3 => false,
                    (false, 3) => true,
                    (otherwise, _) => otherwise,
                };

                next[idx] = next_cell;
            }
        }

        self.cells = next;
    }

    // Helper functions below...
    fn get_index(&self, x: usize, y: usize) -> usize {
        (y * self.width + x) % self.size()
    }

    fn live_neighbor_count(&self, x: usize, y: usize) -> usize {
        let mut count = 0;
        for delta_y in [self.height - 1, 0, 1].iter().cloned() {
            for delta_x in [self.width - 1, 0, 1].iter().cloned() {
                if delta_x == 0 && delta_y == 0 {
                    continue;
                }

                let neighbor_x = (x + delta_x) % self.width;
                let neighbor_y = (y + delta_y) % self.height;
                if self.cells[self.get_index(neighbor_x, neighbor_y)] {
                    count += 1;
                }
            }
        }
        count
    }

    pub fn toggle_cell(&mut self, row: usize, col: usize) {
        // console::log_1(&"toggle_cell".into());
        let idx = self.get_index(row, col);
        self.cells[idx] = !self.cells[idx];
    }

}

#[wasm_bindgen]
pub fn get_memory() -> JsValue {
    wasm_bindgen::memory()
}