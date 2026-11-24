# Washboard

A full-stack Rust starter using Leptos and Axum. Axum renders the initial HTML on the server, and Leptos hydrates it in the browser with WebAssembly.

## Development

With stable Rust installed, add the WebAssembly target and install cargo-leptos.

```sh
rustup target add wasm32-unknown-unknown
cargo install cargo-leptos --locked
```

Start the development server with live reload.

```sh
cargo leptos watch
```

Open [http://localhost:3000](http://localhost:3000). The welcome page includes a counter that exercises browser interactivity.

- `src/app.rs` defines shared components and routes.
- `src/main.rs` starts the Axum server.
- `src/lib.rs` provides the browser hydration entry point.
- `style/main.scss` and `public/` contain styles and static assets.

## Release build

```sh
cargo leptos build --release
```

## Browser tests

Install the Playwright dependencies inside `end2end`, then run the tests while the development server is running.

```sh
(cd end2end && npm ci && npx playwright install)
cargo leptos end-to-end
```
