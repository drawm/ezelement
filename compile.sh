#!/bin/bash

mkdir -p out
deno bundle --config tsconfig.json src/mod.ts out/index.js
