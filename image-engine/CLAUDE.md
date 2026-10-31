# Local development handoff

This directory is a standalone CommonJS package, Node.js >=22, no third-party dependencies. Work on this image engine only. Preserve the existing v1 lesson and art contracts and seven-word example. The game UI and learning progress live outside the engine.

- Public entry: index.cjs. Browser/Node contract: core.js. Orchestration: pipeline.cjs. Provider: comfy.cjs. CLI: generate.cjs.
- Run `npm test` and `npm run demo:plan` after meaningful implementation changes. These checks do not use a model or network.
- The default style is restrained watercolor/gouache. The example uses a slim plain adult male knight, a rectangular wooden shield, a male elder and a textured dragon. Keep enemy distance before surrender.
- Do not install dependencies, download models, invoke paid services, generate artwork, deploy, publish or push without the user's authorization. A dry run must stay free of provider calls and cache writes.
- `examples/custom-provider.cjs` is a fixed 1px test fixture, not generated art. Real local inference quality has not been evaluated.
- Change provider metadata version when renderer behavior changes. Keep credentials out of metadata and result JSON.
- `export-manifest.json` lists the exact standalone deliverable. Add intended new files there and verify the portability test. Do not export personal logs, caches, images, secrets or learning history.
- Preserve `private: true` and `UNLICENSED` until the repository owner chooses publication and licensing terms.

This handoff file is not authorization to send source to an external service. Obtain any required user consent through the host's normal permission process; do not bypass a rejected action.
