#!/bin/bash
cd wasm-cgol
RUSTFLAGS="-Zlocation-detail=none" wasm-pack build --target web --release --features "rayon web-sys"
cd ..
python3 -m http.server 9922
