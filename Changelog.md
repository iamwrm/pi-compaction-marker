# Changelog

## 2026-07-15

### Changed
- Package version 0.1.2. Updated the pi coding-agent development dependency and lockfile to 0.80.7.

### Validated
- Compaction/session entry contracts used by `0010-compaction-kept-marker.ts` are unchanged in pi 0.80.7; strict typecheck passes without a source migration.

## 2026-07-10

### Changed
- Package version 0.1.1. Updated the pi coding-agent development dependency and lockfile to 0.80.6; the existing compaction marker source passes strict typecheck unchanged.

## 2026-06-16

### Added
- Initial standalone `pi-compaction-marker` package, split from `ren-public-package` extension `0010-compaction-kept-marker.ts`.
