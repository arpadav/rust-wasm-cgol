// use wasm_bindgen::prelude::*;

// #[wasm_bindgen]
// pub struct GameOfLife {
//     cells: Vec<u8>,
//     pub width: usize,
//     pub height: usize,
// }

// #[wasm_bindgen]
// impl GameOfLife {
//     pub fn new(w: usize, h: usize) -> GameOfLife {
//         // Ensure that the width is a multiple of the number of bits in a byte to simplify operations
//         // assert!(w % 8 == 0, "Width must be a multiple of 8 for SIMD optimization.");

//         // round width to nearest multiple of 8
//         let w = (w + 7) & !7;
        
//         GameOfLife {
//             cells: vec![0; w * h / 8], // Each byte holds 8 cells
//             width: w,
//             height: h,
//         }
//     }

//     pub fn size(&self) -> usize {
//         self.width * self.height
//     }

//     pub fn render(&self) -> *const u8 {
//         // std::mem::forget(&self.cells);
//         self.cells.as_ptr()
//     }

//     pub fn tick(&mut self) {
//         let mut next = self.cells.clone();

//         for y in 0..self.height {
//             for x in 0..self.width {
//                 let idx = self.get_index(x, y);
//                 let cell = self.cells[idx];
//                 let live_neighbors = self.live_neighbor_count(x, y);

//                 let next_cell = match (cell, live_neighbors) {
//                     (true, x) if x < 2 => false,
//                     (true, 2) | (true, 3) => true,
//                     (true, x) if x > 3 => false,
//                     (false, 3) => true,
//                     (otherwise, _) => otherwise,
//                 };

//                 next[idx] = next_cell;
//             }
//         }

//         self.cells = next;
//     }
    
//     pub fn toggle_cell(&mut self, row: usize, col: usize) {
//         let idx = self.get_index(row, col / 8);
//         let bit = col % 8;
//         self.cells[idx] ^= 1 << bit;
//     }

//     // Helper functions below...
//     fn get_index(&self, x: usize, y: usize) -> usize {
//         y * (self.width / 8) + (x / 8)
//     }

//     fn live_neighbor_count(&self, x: usize, y: usize) -> usize {
//         let mut count = 0;
//         for delta_y in [self.height - 1, 0, 1].iter().cloned() {
//             for delta_x in [self.width - 1, 0, 1].iter().cloned() {
//                 if delta_x == 0 && delta_y == 0 {
//                     continue;
//                 }

//                 let neighbor_x = (x + delta_x) % self.width;
//                 let neighbor_y = (y + delta_y) % self.height;
//                 if self.cells[self.get_index(neighbor_x, neighbor_y)] {
//                     count += 1;
//                 }
//             }
//         }
//         count
//     }
// }

// #[wasm_bindgen]
// pub fn get_memory() -> JsValue {
//     wasm_bindgen::memory()
// }