dev:
	deno test \
		--no-check \
        --unstable \
        --reload \
		--config tsconfig.json \
		--watch \
		src/*.test.ts
test:
	deno test \
        --unstable \
        --reload \
		--config tsconfig.json \
		--watch \
		src/*.test.ts

build:
	deno cache --no-check main.ts out/main.ts
	deno bundle --unstable \
        --no-check \
        --reload \
		--config tsconfig.json \
		./src/mod.ts \
		out/index.js


