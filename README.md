# Vitrine

A display case for the [Omarchy](https://omarchy.org) desktop: clocks, dates,
readings and notes, set out behind your windows.

![Vitrine](preview.png)

Vitrine puts small pieces on the wallpaper and leaves the rest of the desktop
alone. There are clocks in 25 faces, the date in ten forms from one line to the
whole year, the machine's own numbers, whatever is playing, and text you write
yourself: a note, a quote, a countdown. Each piece can stand bare on the
wallpaper or sit on a card, plain or ornate, in the colors of the current theme.

Nothing on the desktop changes underneath. The widgets ignore the mouse, so
clicking or right clicking the wallpaper works exactly as it did before.

## Setup

```bash
omarchy plugin add https://github.com/qempexe/omarchy-vitrine.git --enable --yes
omarchy restart shell
```

The widgets appear right away. For the settings, add the Vitrine button to the
bar: through the bar's own settings, or by adding
`{ "id": "io.github.qempexe.vitrine" }` to `bar` → `layout` in
`~/.config/omarchy/shell.json`.

## Ready-made desks

Sixteen complete arrangements, each with its own widgets, positions, cards,
colors and type. Pick one in **Looks** and adjust from there. If the result is
worse than what came before, **Undo the last look** puts the old desk back.
With **Keep my widgets** on, a look restyles the widgets already there instead
of replacing them.

![Looks, part 1](screenshots/looks-1.png)
![Looks, part 2](screenshots/looks-2.png)

## Clocks

Twenty-five faces. The digital ones: Plain, Stacked, Sidecar, Editorial, Binary,
LCD (unlit segments included), Flip, Dot matrix, Nixie, Odometer, Roman, Totem
and Day bars. The written ones: In words, Roughly ("almost half past four") and
a Letter grid that lights up the words. The dials: Classic, Minimal, Ornate,
Orbit, Rings, Bauhaus, Pie, Radar, and a Day dial that turns once every
twenty-four hours.

Any face can show seconds, use a 12 or 24 hour clock, or blink its colon. Give
a clock a time zone such as `Asia/Tokyo` and a city name as its caption and it
becomes a world clock, daylight saving time included.

![Clock faces, part 1](screenshots/faces-1.png)
![Clock faces, part 2](screenshots/faces-2.png)

## Dates

One line, Stacked, a Tear-off calendar page, a Letter ("Friday, the sixteenth of
October"), ISO with week number and day of the year, the current Week, the
current Month, the whole year as dots, progress bars for the year, month, week
and day, and the Moon as it is tonight.

![Dates](screenshots/dates.png)

## System and media

The system widget shows any of processor, memory, disk, battery, temperature,
network, load, uptime and swap, in the order chosen. They can be drawn as rings,
bars, a terminal readout, one-minute graphs, dots, gauges or a single large
figure.

Now playing follows any player that reports to the system (Spotify, browsers,
mpv and so on), or one player chosen by name. Five styles: cover, album, a
single line, a spinning record and a large title. It can hide itself when
nothing plays.

![System and media](screenshots/system-media.png)

## Notes and countdowns

A note, a rotating quote (a different one each day, from a list you write), a
greeting that changes with the time of day, a countdown to a date, or the time
elapsed since one. Seven styles: plain, quotation, headline, terminal, banner,
large counter and blackletter.

![Text](screenshots/text.png)

## Cards

A card is optional. Without one, the widget sits directly on the wallpaper with
a soft shadow for contrast. With one, there are 44 shapes to choose from.

Seventeen are whole-card shapes: rounded, square, pill, cut corners, ticket,
stamp, scalloped, arch, ogee, cartouche, plaque, crest, hexagon, folder,
instant photo, oval and circle. The other twenty-six keep a plain top and bottom
and change only the left and right ends: slanted, arrows, ribbon, leaf, sail,
bullet, folded corner, zigzag, braces, battlement, puzzle piece, needle, cloud,
fleur, scroll, onion dome, corbel and more. Pointed ones can point left, right
or both ways; round ones can keep their top or bottom corners square.

![Shapes, part 1](screenshots/cards-1.png)
![Shapes, part 2](screenshots/cards-2.png)

On top of the shape come three more choices: one of 30 surfaces (frost, metal,
keycap, marble, velvet, wood, terrazzo, leather, stained glass and others), solid
or graded into a second color; one of 22 edge lines; and one of 18 ornaments.
Lines and ornaments are fitted to the actual outline, so a wavy line or a string
of pearls goes round a circle or an onion dome as neatly as round a rectangle,
and corner studs land in the shape's real corners.

![Surfaces](screenshots/surfaces.png)
![Lines](screenshots/lines.png)
![Ornaments](screenshots/ornaments.png)

## Placing widgets

**Arrange** (a right click on the button, or the button in the settings) lifts
the widgets above the windows on a dimmed desktop. In that mode:

- drag a widget to move it, drag its corner to resize it;
- hold Shift to place it off the grid;
- arrow keys nudge the selected widget, D duplicates it, Delete removes it;
- Tab selects the next one, Esc leaves Arrange.

The strip at the top adds new widgets, on the screen they are added from.

![Arrange](screenshots/arrange.png)

## Several screens

Each screen has its own desktop, and Arrange opens on all of them together.

- **Placement.** A widget's **Show on** setting puts it on the main screen, on
  every screen (one copy each), or on one named screen.
- **Moving between screens.** Drag a widget across the edge of its screen; a
  "→ HDMI-A-1" label shows where it will land. Alternatively select it and press
  **S**, or use the **To HDMI-A-1** button, to send it to the next screen.
- **The main screen** is the first one Hyprland lists, unless another is chosen
  under **Desktop › Screens**. Widgets set to the main screen follow that choice.
- **Unplugged screens.** Their widgets move to the main screen, or stay hidden,
  until the screen is connected again. Then they return to it.
- **Different sizes.** Positions are stored as a fraction of the screen, so a
  widget in a corner stays in that corner. With **Sizes follow** set to **Each
  screen's height**, widgets also scale with the screen: larger on a 4K monitor,
  smaller on a laptop panel.
- **Hiding behind windows** is decided per screen, by that screen's workspace.

## The settings panel

A left click on the button opens it. Changes apply immediately and are saved in
`~/.local/state/omarchy-vitrine/settings.json`. **Alt+←** and **Alt+→** move
between tabs, and the search field covers every setting.

<table>
<tr>
<td><img src="screenshots/settings-looks.png" alt="Looks"></td>
<td><img src="screenshots/settings-widgets.png" alt="Widgets"></td>
<td><img src="screenshots/settings-widget-style.png" alt="A widget's style"></td>
<td><img src="screenshots/settings-shape.png" alt="Shape"></td>
<td><img src="screenshots/settings-surface.png" alt="Surface"></td>
<td><img src="screenshots/settings-lines.png" alt="Lines"></td>
</tr>
<tr>
<td><img src="screenshots/settings-ornaments.png" alt="Ornaments"></td>
<td><img src="screenshots/settings-type.png" alt="Type"></td>
<td><img src="screenshots/settings-colors.png" alt="Colors"></td>
<td><img src="screenshots/settings-motion.png" alt="Motion"></td>
<td><img src="screenshots/settings-desktop.png" alt="Desktop"></td>
<td><img src="screenshots/settings-panel.png" alt="Panel"></td>
</tr>
</table>

| Tab | Covers |
| --- | --- |
| Looks | the sixteen ready-made desks, and twenty slots for your own, widgets included |
| Widgets | every widget on the desktop; select one for its style, size, position, screen, card, accent, opacity, caption and content |
| Shape | the card shape, the direction it points, square corners, roundness and inner padding |
| Surface | the material, its opacity, solid, gradient or glass fill (with the gradient's color and direction), texture, depth and shadow |
| Lines | the edge line, its color and width, an optional gradient, and which side a rail runs along |
| Ornaments | decoration on the card, in the accent color |
| Type | seven bundled fonts (Inter, Playfair, Cormorant, Space Grotesk, JetBrains Mono, Bebas Neue and a blackletter), the theme's font, or any installed font by search; weights from hairline to black; a text effect for widgets without a card |
| Colors | the theme's colors, a palette color per widget, the window border's colors spread across the screen, your own colors, or monochrome |
| Motion | how widgets appear, together or one after another; sweeping second hands; Flip and Odometer animation |
| Desktop | hiding when windows are open or one is fullscreen, overall size (fixed or by screen height), the main screen and what happens when a screen is unplugged |
| Panel | the button, right and middle click, and the panel's size, spacing, corners, outline, text size, tint and opacity |

## Bar button

| Click | Action |
| --- | --- |
| Left | settings |
| Right | Arrange, or the next look |
| Middle | show or hide the widgets, or Arrange |

With **Bar button** set to **Hidden**, Vitrine runs without a button; the
settings are then reached from the command line.

## Command line

```bash
omarchy-shell io.github.qempexe.vitrine settings      # open the settings (again to close)
omarchy-shell io.github.qempexe.vitrine arrange       # Arrange on / off
omarchy-shell io.github.qempexe.vitrine toggle        # show / hide the widgets (also: show, hide)
omarchy-shell io.github.qempexe.vitrine look salon    # any look: quiet salon gazette glass console bauhaus orbit flip
                                                      # nixie cathedral dashboard studio corner words countdown neon
omarchy-shell io.github.qempexe.vitrine next          # the next look
omarchy-shell io.github.qempexe.vitrine undo          # back to before the last look
omarchy-shell io.github.qempexe.vitrine add clock     # add a widget: clock date system media text
omarchy-shell io.github.qempexe.vitrine addOn clock HDMI-A-1   # on one screen ('*' for every screen)
omarchy-shell io.github.qempexe.vitrine moveTo w3 DP-1  # a widget onto another screen ('*' every, '' main)
omarchy-shell io.github.qempexe.vitrine screens       # the screens, and which is the main one, as json
omarchy-shell io.github.qempexe.vitrine save 2        # keep the desktop in place 2 (1 to 20)
omarchy-shell io.github.qempexe.vitrine saveNew       # in the first free place
omarchy-shell io.github.qempexe.vitrine load 2        # and bring it back
omarchy-shell io.github.qempexe.vitrine exportLook    # the whole desktop as one line of json
omarchy-shell io.github.qempexe.vitrine importLook '{"frame":"arch"}'
omarchy-shell io.github.qempexe.vitrine status        # as json
```

`exportLook` prints the whole desk, widgets and positions included, as a single
line. Anyone can paste that line into `importLook` to get the same desk. Imports
accept look settings only, and each value is checked before it is used.

## Notes on behaviour

- **Cost.** A widget is redrawn only when its content changes: a clock without
  seconds once a minute, a date once a minute, a card only when its settings
  change. System readings run only while a system widget exists. They read a
  few files under `/proc` every few seconds, take the battery from UPower when it
  reports a change, and check disk usage once a minute. Now playing waits for
  the players to report, and polls the playback position once a second only
  while something is playing. Sweeping second hands are the one thing drawn
  continuously, and only while visible.
- **Input.** The widgets live on the desktop layer with an empty input region,
  so the wallpaper keeps all its clicks. Only Arrange takes the mouse.
- **Network.** None, apart from the cover art URL a music player provides.

## Source layout

```
qml/
├── Service.qml        settings, colors, fonts, readings, looks, ipc
├── BarWidget.qml      the bar button
├── desk/              Desktop (the widgets on the desktop), Arrange, WidgetView, Busy
├── core/              SettingsStore, UiState, SystemData, MediaData, Zones
├── panel/             Panel, PopoutWindow, PanelView, SettingsView, SettingRow,
│                      WidgetsEditor, PresetGrid, LookSlots, TileArt
├── controls/          Btn, Chip, Sw, Txt, TextBox
└── js/                Schema.js (settings and looks), Kinds.js (the kinds of widget),
    │                  Look.js (colors and cards), Screens.js (which screen), Card.js, Trace.js, ...
    └── parts/         Faces, Dates, Meters, Media, Notes (the styles), Frames,
                       Surfaces, Lines, Ornaments: one entry for each, with its drawing
fonts/                 seven OFL fonts and their licenses
tests/test_vitrine.js  node tests/test_vitrine.js
```

A new clock face, card shape, surface, line or ornament is a single entry in a
single file. [CONTRIBUTING.md](CONTRIBUTING.md) explains the format.

## Upgrading and uninstalling

```bash
omarchy plugin update io.github.qempexe.vitrine
omarchy restart shell
```

```bash
omarchy plugin remove io.github.qempexe.vitrine
omarchy restart shell
rm -rf ~/.local/state/omarchy-vitrine   # settings and saved looks
```

## License

[MIT](LICENSE). The fonts in `fonts/` are under the [SIL Open Font License](fonts/licenses).
