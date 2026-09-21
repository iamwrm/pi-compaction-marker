# pi-compaction-marker

Pi extension that labels context compaction boundaries in `/tree`.

When pi compacts a session, it stores a compaction node and the id of the first
entry kept verbatim in model context. This extension labels both ends:

- the compaction node: `compaction N`
- the first visible kept entry: `compaction N — kept from here (~Xk)`

Install as a pi package:

```bash
pi install git:https://github.com/iamwrm/pi-compaction-marker.git
```

For local development:

```bash
npm install
npm run check
```

## Development

Requires Pi >=0.86.1. Run `npm test` for strict TypeScript and offline permanent
SessionManager reconciliation tests, including system checkpoints, usage,
branching, idempotence and preservation of user labels. `npm run check` remains
the typecheck-only gate.
