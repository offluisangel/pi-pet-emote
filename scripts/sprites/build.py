"""Rebuild the single pet set without dependencies or changes to playback timing."""
import json
from pathlib import Path
import sys

# Also protect old `node build.ts` invocations from leaving bytecode caches.
sys.dont_write_bytecode = True
import motion

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / 'emotes' / 'pet'


def build():
    contract = json.loads((HERE / 'frames.json').read_text())
    count = 0
    for state, files in contract['frames'].items():
        directory = OUT / state
        directory.mkdir(parents=True, exist_ok=True)
        for index, name in enumerate(files):
            (directory / name).write_bytes(motion.render(state, name, index))
            count += 1
    # Use the shipped metadata, not the superseded TypeScript generator's timings.
    (OUT / 'emotes.json').write_text(json.dumps(contract['emotes'], indent=2) + '\n')
    (ROOT / 'docs' / 'avatar.png').write_bytes((OUT / 'idle' / 'idle.png').read_bytes())
    print(f'sprites: {count} frames, {len(contract["frames"])} states → emotes/pet (48x40 RGBA)')


if __name__ == '__main__':
    build()
