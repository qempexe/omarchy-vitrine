# Changelog

All notable changes to Vitrine. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-27

### Added

- An **About** tab with the logo, the version and a link to more plugins, and the logo
  in the panel's header.

### Changed

- Now playing shows covers as small copies made in a separate, limited process. Covers
  given as a web address are fetched with a size and a time limit. Needs `curl` and
  `vipsthumbnail` (libvips), which Omarchy already has.
- The JavaScript is written in ES6: `const` and `let`, arrow functions and method
  shorthand.
- The README follows a new layout.

### Fixed

- Custom colors are used exactly as picked, in the panel and on the widgets: the text,
  the background and the accent no longer change to suit each other.
- Text without a card follows its setting with custom colors too.

## [1.0.0] - 2026-10-19

### Added

- First release: desktop widgets behind your windows. Clocks in 25 faces, dates in ten
  forms, system readings, now playing and notes, on cards with 44 shapes, 30 surfaces,
  22 lines and 18 ornaments. Sixteen ready-made desks, twenty places for your own,
  Arrange mode, and placement across several screens.

[1.1.0]: https://github.com/qempexe/omarchy-vitrine/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/qempexe/omarchy-vitrine/releases/tag/v1.0.0
