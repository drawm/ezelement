#!/bin/bash

mkdir -p out
deno bundle --config tsconfig.json src/index.ts out/index.js
