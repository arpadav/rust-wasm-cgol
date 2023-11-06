#!/bin/bash
cd wasm-cgol
wasm-pack build --target web
cd ..
python -m http.server