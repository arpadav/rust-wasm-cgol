use wasm_bindgen::prelude::*;
#[cfg(feature = "rayon")]
use rayon::prelude::*;
#[cfg(feature = "web-sys")]
use web_sys::console;

#[wasm_bindgen]
pub struct GameOfLife {
    cells: Vec<bool>,
    pub width: usize,
    pub height: usize,
    pub size: usize,
}

#[wasm_bindgen]
impl GameOfLife {
    pub fn new(w: usize, h: usize) -> GameOfLife {
        #[cfg(feature = "web-sys")]
        console::log_1(&"im making myself!".into());
        let mut cells: Vec<bool> = (0..w * h).map(|_| false).collect();
        cells
            .iter_mut()
            .for_each(|x| *x = js_sys::Math::random() < 0.5);
        GameOfLife { cells: cells, width: w, height: h, size: w * h }
    }

    pub fn render(&self) -> *const bool {
        self.cells.as_ptr()
    }

    #[cfg(not(feature = "rayon"))]
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

    #[cfg(feature = "rayon")]
    pub fn tick(&mut self) {
        #[cfg(feature = "web-sys")]
        console::log_1(&"ping!".into());
        let mut next = self.cells.clone();
        next.par_iter_mut().enumerate().for_each(|(idx, next_cell)| {
            let x = idx % self.width;
            let y = idx / self.width;
            let cell = self.cells[idx];
            let live_neighbors = self.live_neighbor_count(x, y);
            *next_cell = match (cell, live_neighbors) {
                (true, x) if x < 2 => false,
                (true, 2) | (true, 3) => true,
                (true, x) if x > 3 => false,
                (false, 3) => true,
                (otherwise, _) => otherwise,
            };
        });
        self.cells = next;
    }

    #[inline(always)]
    fn get_index(&self, x: usize, y: usize) -> usize {
        (y * self.width + x) % self.size
    }

    #[inline(always)]
    fn live_neighbor_count(&self, x: usize, y: usize) -> usize {
        (-1..=1)
        .flat_map(|dy| (-1..=1).map(move |dx| (dx, dy)))
        .filter(|&(dx, dy)| !(dx == 0 && dy == 0))
        .fold(0, |acc, (dx, dy)| {
            let neighbor_x = (x as isize + dx).rem_euclid(self.width as isize) as usize;
            let neighbor_y = (y as isize + dy).rem_euclid(self.height as isize) as usize;
            acc + self.cells[self.get_index(neighbor_x, neighbor_y)] as usize
        })
    }

    #[inline(always)]
    pub fn toggle_cell(&mut self, row: usize, col: usize) {
        let idx = self.get_index(col, row);
        self.cells[idx] = !self.cells[idx];
    }
}

#[wasm_bindgen]
pub fn get_memory() -> JsValue {
    wasm_bindgen::memory()
}