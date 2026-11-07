# Changelog

All notable changes to Vitrine. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [1.2.1] - 2026-11-08

### Fixed

- Theme gradients and palette colors now read Omarchy's named color keys as well as
  indexed `color1` keys, so themes such as Spectral use their full palette.

## [1.2.0] - 2026-11-08

### Added

- **Theme colors** for the gradient fill. *Gradient into* now also has *Theme colors*,
  which runs the card through several colors of your Omarchy theme, not only two.
  It follows the theme as it changes.
- **Theme colors** for gradient lines (*Fade into*). The lines, and the rails and
  brackets drawn with them, run through several colors of your theme.

### Changed

- New desks now start with the active Omarchy theme's full color spectrum on cards and
  lines. They update when you choose another theme; existing color choices stay editable.
- Theme colors takes the theme's palette, then the window border's colors if there is no
  palette. With Custom or Monochrome colors it runs through shades of your accent
  instead, so Monochrome stays without a hue.
- *Gradient into* and *Fade into* show their choices as chips, so the longer names fit.

## [1.1.1] - 2026-11-05

### Fixed

- On Omarchy 4.5, where the bar's window spans the screen, the panel didn't open, or
  opened over the bar. It now opens off the bar's outer edge, on any edge and with any
  bar size.

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

[1.2.1]: https://github.com/qempexe/omarchy-vitrine/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/qempexe/omarchy-vitrine/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/qempexe/omarchy-vitrine/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/qempexe/omarchy-vitrine/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/qempexe/omarchy-vitrine/releases/tag/v1.0.0
