# Angband Town Online

This workspace is the starting point for a multiplayer reinterpretation of Angband focused on:

- a shared town
- instanced dungeons
- live player chat
- public open-source development

The original `Angband-4.2.6` source is included for reference and selective reuse. The multiplayer game should be treated as a new networked architecture rather than a thin patch over the single-player executable.

## License

The new project code in this repository is intended to be GPL v2. The bundled upstream `Angband-4.2.6` source keeps its original notices and upstream licensing terms. See [LICENSE.md](/C:/Users/Joshua%20Nelson/OneDrive/Documents/BootcampAHAStack/bootcamp-week4/LICENSE.md).

## V1 Scope

Version 1 aims to support:

- account login
- persistent characters
- a shared town map
- real-time town presence
- live chat channels
- private or party dungeon instances
- returning from dungeon instances to town with saved progress

Out of scope for v1:

- trading economy
- guilds
- large shared overworld zones
- PvP
- auction house
- full live-ops tooling

## Recommended Stack

- `apps/web`: Astro-based website and browser game shell
- `apps/server`: Node.js + TypeScript authoritative server
- `packages/protocol`: shared WebSocket message schemas and event types
- `packages/game-core`: extracted game rules, map/state models, and combat logic
- `PostgreSQL`: accounts, characters, inventory, dungeon metadata, chat history
- `Redis`: presence, matchmaking, pub/sub, transient instance/session state
- `WebSockets`: gameplay and chat transport

## Why Not Use AHA For Everything?

Astro, HTMX, and Alpine are great for:

- landing pages
- account screens
- character select
- admin tools
- lore pages and docs

They are not the right foundation for the authoritative real-time simulation loop. The gameplay client should use a browser rendering layer with WebSockets while the website can still use the AHA stack around it.

## Next Documents

- [Architecture](/C:/Users/Joshua%20Nelson/OneDrive/Documents/BootcampAHAStack/bootcamp-week4/docs/architecture-v1.md)
