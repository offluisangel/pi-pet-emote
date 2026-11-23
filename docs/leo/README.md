# Leo sprites

Leo is a fluffy orange-and-white cat with small yellow-green almond eyes and a
green collar. The final approved baseline is
[`emotes/leo/idle/idle.png`](../../emotes/leo/idle/idle.png); its decoded RGBA pixels
are pinned by a SHA-256 test, independently of PNG compression. Mafe remains the
default and is unchanged.

## Build and verify

- `npm run sprites` rebuilds both sets in the repository.
- `node scripts/sprites/leo.ts [output-directory [contact-sheet-path]]` rebuilds
  Leo. With an output directory, it writes only the set there unless a contact
  sheet path is also supplied. With no arguments, it updates Leo and its docs sheet.
- `python3 -B scripts/sprites/build.py [output-root]` rebuilds Mafe under
  `output-root/emotes/pet` and its avatar under `output-root/docs`. The default
  output root is the repository.
- `npm run check:generated` owns reproducibility verification: it builds both
  sets, metadata, avatar and contact sheet in a temporary directory, compares
  decoded PNG dimensions/pixels and exact metadata, then removes the temporary
  output. It reports missing, altered or extra assets without repairing them.
- `npm test` validates delivered Leo assets and precise blink/tail locality;
  it does not rebuild Leo. These checks do not establish visual quality for
  every gesture; review the contact sheet for that.
- `npm run pack:check` validates both shipped 76-frame sets and rejects other
  pixel sets or extra non-runtime files.

## Artwork contract

Authoring lives in `scripts/sprites/leo.ts` (approved drawing) and
`scripts/sprites/leo/motion.ts` (cat gestures). Frame names, state order, playback
modes, weights and timings reuse `scripts/sprites/frames.json` without changes.
Leo has all 24 states and 76 transparent 48×40 RGBA PNGs. The sleepy `grandma`
state shows blanket kneading and sleep, not a second character.

[`contact-sheet.png`](contact-sheet.png) shows every final frame at 3× nearest
neighbor scale, one row per state in contract order:

ask, build, bye, compact, delegate, explore, failure, grandma, hi, idle, jira,
jobs, judge, read, remember, review, success, super-yolo, talk, think, tool,
verify, write, yolo.

The idle blink changes only the approved eye boxes; the greeting's landed wave
integrates the approved upper-tail sway with its root anchored. Props and paws
move independently for reading, writing, tools, task passing, building, checking,
reviewing and the other purpose-specific gestures. This asset addition does not
change runtime selection, configuration defaults, or the package avatar.
