# Protocol Notes

The multiplayer rewrite will use an event-based WebSocket protocol with JSON payloads in v1.

## Message Families

- `auth.*`
- `session.*`
- `presence.*`
- `town.*`
- `instance.*`
- `chat.*`
- `system.*`

## Initial Client -> Server Messages

```json
{ "type": "auth.login", "username": "player1", "password": "dev-only" }
{ "type": "town.move", "direction": "north" }
{ "type": "instance.create", "kind": "solo" }
{ "type": "instance.enter", "instanceId": "inst_123" }
{ "type": "chat.send", "channel": "town", "text": "hello town" }
```

## Initial Server -> Client Messages

```json
{ "type": "session.ready", "playerId": "p1", "characterId": "c1" }
{ "type": "presence.snapshot", "mapId": "town_1", "players": [] }
{ "type": "town.state", "player": { "x": 10, "y": 5 }, "players": [] }
{ "type": "chat.message", "channel": "town", "from": "p1", "text": "hello town" }
{ "type": "system.error", "message": "invalid direction" }
```

## Design Rules

- clients send intent, not resolved outcomes
- server owns authoritative positions and combat results
- chat messages are validated and rate-limited server-side
- presence snapshots can be full-state at first, then optimized to deltas later

