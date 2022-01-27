dev:
	deno test \
		--no-check \
        --unstable \
        --reload \
		--config deno.json \
		--watch \
		src/*.test.ts
test:
	deno test \
        --unstable \
        --reload \
		--config deno.json \
		--watch \
		src/*.test.ts

build:
	deno cache --no-check main.ts out/main.ts
	deno bundle --unstable \
        --no-check \
        --reload \
		--config deno.json \
		./src/mod.ts \
		out/index.js


