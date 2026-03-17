# V1 Architecture

## Product Goal

Build a public open-source multiplayer dungeon crawler inspired by Angband with:

- a shared social town
- instanced dungeon runs
- live chat similar to MMO zone and party chat
- persistent characters

This is a multiplayer rewrite, not a direct network-enablement of the legacy executable.

## Core Architecture Decision

The server is authoritative.

Clients do not decide combat results, movement validity, item creation, or monster actions. Clients send player intents. The server validates the request, mutates world state, and broadcasts resulting events.

This decision is what makes shared town, instancing, and chat reliable.

## System Overview

```text
Browser Client
  -> WebSocket Gateway
  -> Game Server
      -> Town Service
      -> Instance Service
      -> Chat Service
      -> Character Service
      -> Persistence Layer
  -> PostgreSQL
  -> Redis
```

## Proposed Repository Layout

```text
bootcamp-week4/
  Angband-4.2.6/
  apps/
    web/
    server/
  packages/
    protocol/
    game-core/
  docs/
    architecture-v1.md
  README.md
```

## Major Components

### 1. Browser Client

Responsibilities:

- login and character selection UI
- render town and dungeon maps
- send player commands
- display chat in real time
- render nearby players, monsters, items, and events

Notes:

- Astro can provide page structure and non-game screens
- actual gameplay should run in a client-side interactive app mounted inside Astro
- initial rendering can be tile or ASCII-grid based

### 2. WebSocket Gateway

Responsibilities:

- accept authenticated client connections
- resume player sessions after reconnect
- route messages to gameplay and chat handlers
- throttle malformed or spammy traffic

This should be the network edge for both chat and gameplay events.

### 3. Game Server

Responsibilities:

- own authoritative world state
- process player commands
- resolve movement, combat, AI, loot, and transitions
- broadcast state deltas back to clients

Recommended internal split:

- `Town Runtime`: one shared map process or module for town
- `Instance Runtime`: one runtime per dungeon instance
- `Character Runtime`: loads and saves durable character state

### 4. Chat Service

Responsibilities:

- channel membership
- message broadcast
- moderation hooks
- optional short history replay on join

Initial channels:

- `global`
- `town`
- `instance:<instanceId>`
- `party:<partyId>`
- `whisper`

Recommended behavior:

- town chat reaches all players in town
- instance chat reaches only players in that dungeon instance
- global chat can be enabled later if moderation burden becomes too high early on
- chat history should be persisted lightly, with rate limits from day one

### 5. PostgreSQL

Use for durable state:

- accounts
- sessions
- characters
- inventories
- equipment
- progression
- dungeon run metadata
- chat logs if desired

Suggested first tables:

- `accounts`
- `characters`
- `character_stats`
- `character_inventory`
- `sessions`
- `parties`
- `dungeon_instances`
- `chat_messages`

### 6. Redis

Use for fast-changing shared state:

- connection presence
- pub/sub fanout
- temporary party state
- temporary dungeon instance routing
- rate limiting counters

Redis should complement, not replace, PostgreSQL.

## Gameplay Model

## Shared Town

Town is a persistent shared social space.

Town supports:

- player login spawn point
- visible nearby players
- emotes later if desired
- chat
- shops or NPC interaction later
- dungeon entrance creation

Town should be simpler than a dungeon:

- low or no combat in v1
- fewer interactive systems
- reliable movement and presence first

## Instanced Dungeons

Each dungeon run is isolated.

Instance types for v1:

- solo instance
- party instance

Instance lifecycle:

1. player or party requests dungeon entry
2. server creates `instanceId`
3. server clones or generates dungeon state
4. players are moved from town presence to instance presence
5. instance runs until exit, death, or abandonment
6. rewards and character state are persisted
7. instance is destroyed after empty timeout

This approach avoids the complexity of dozens of players interacting in the same dungeon simulation.

## Combat and Turn Model

Angband is originally turn-based and single-player. For multiplayer v1, there are two practical approaches:

### Option A: Server Tick With Action Cooldowns

- server runs at a fixed tick rate
- movement and actions consume energy or cooldown
- monsters act on the same scheduler
- easier to synchronize in multiplayer

### Option B: Strict Sequential Turns Inside Instances

- every player action advances the instance state
- awkward with multiple players online
- makes chat and coexistence harder

Recommendation:

Use Option A for multiplayer v1. Preserve Angband-like pacing by using an energy system inspired by the original game rather than literal single-user turns.

## Legacy Code Reuse Strategy

Do not begin by trying to network-enable the old UI and savefile flow directly.

Instead:

1. identify reusable gameplay logic from `Angband-4.2.6/src`
2. port or wrap logic into `packages/game-core`
3. expose clean state transitions for server use
4. rebuild UI and persistence around those transitions

Likely reusable ideas:

- map generation rules
- monster definitions
- item definitions
- combat formulas
- status effect rules

Likely poor fits for direct reuse:

- terminal UI code
- local savefile assumptions
- direct input loops
- global singleton state

## Networking Model

All gameplay and chat traffic flows through WebSockets.

Suggested message categories:

- auth
- session
- presence
- movement
- combat
- inventory
- instance
- chat
- system

Example message shapes:

```json
{ "type": "auth.login", "token": "..." }
{ "type": "town.move", "direction": "west" }
{ "type": "instance.enter", "entranceId": "town-north-dungeon" }
{ "type": "chat.send", "channel": "town", "text": "hello everyone" }
{ "type": "presence.snapshot", "players": [] }
```

## State Ownership

State should be split by durability and authority:

- client: local rendering state, keybinds, transient UI
- Redis: transient routing and presence
- server memory: active town and active dungeon simulations
- PostgreSQL: durable progression and audit-worthy records

## Authentication

For v1:

- email/password or simple username/password
- server-issued session token
- character select after login

Keep auth simple. Do not overdesign account systems before gameplay exists.

## Anti-Cheat and Safety

Even for a fun project, add basic guardrails:

- authoritative movement validation
- authoritative combat resolution
- chat rate limiting
- input validation
- profanity/moderation hooks
- reconnect token expiry

## Milestone Plan

### Milestone 0: Foundation

- initialize monorepo
- set up package manager workspace
- add TypeScript tooling
- add lint, test, format, and CI
- define shared protocol package

### Milestone 1: Accounts and Sessions

- login API
- session tokens
- character create/select
- WebSocket auth handshake

### Milestone 2: Shared Town

- town map
- player spawn
- player movement
- nearby player visibility
- join/leave events

### Milestone 3: Live Chat

- town chat channel
- party chat channel
- whisper support
- rate limits
- short message history

### Milestone 4: Dungeon Instances

- create solo instance
- create party instance
- move player from town to instance
- run isolated map state
- leave or complete instance

### Milestone 5: Combat Loop

- player attack
- monster AI
- damage and death
- item drops
- persistence after run

## Recommended First Technical Choices

- package manager: `pnpm`
- runtime: Node.js
- language: TypeScript
- web framework: Astro for pages plus client-side gameplay app
- realtime server: WebSocket server in Node.js
- database ORM: Prisma or Drizzle
- validation: Zod
- testing: Vitest
- deployment: Docker + GitHub Actions

## GitHub Setup Recommendation

Use GitHub for:

- source hosting
- issues and project board
- pull requests
- CI pipelines
- container publishing

Recommended starting branches:

- `main`
- short-lived feature branches prefixed with `feature/`

Recommended workflows:

- lint and typecheck on pull request
- test on pull request
- build Docker images on merge to `main`

## Risks To Watch Early

- trying to preserve too much of the original C runtime shape
- mixing chat and gameplay logic too tightly
- storing too much active world state only in memory without recovery strategy
- premature economy/trading systems
- overbuilding the frontend before a playable loop exists

## Immediate Next Step

Set up the new repo skeleton and start with:

1. monorepo initialization
2. shared protocol definitions
3. WebSocket server scaffold
4. minimal browser client
5. login stub and town presence prototype
