#!/bin/bash

mkdir -p out
deno bundle --config deno.json src/mod.ts out/index.js
