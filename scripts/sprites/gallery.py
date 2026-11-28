"""Make the offline animation artboard from the generated pet PNGs."""
import base64
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SET = ROOT / 'emotes' / 'pet'
OUT = ROOT / 'design' / 'pet-avatar' / '02-animations.html'


def build():
    contract = json.loads((ROOT / 'scripts' / 'sprites' / 'mafe.json').read_text())
    states = []
    for state, names in contract['frames'].items():
        states.append({'name': state, 'frames': [
            {'name': name, 'src': 'data:image/png;base64,' + base64.b64encode((SET / state / name).read_bytes()).decode('ascii')}
            for name in names
        ]})
    template = '''<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pet · all animations</title>
<style>
:root { color-scheme: dark; font-family: system-ui, sans-serif; background: #18161e; color: #f4eddf; }
body { max-width: 1280px; margin: auto; padding: 24px; }
header { margin-bottom: 28px; }
h1 { font-size: 2rem; margin-bottom: 8px; }
p { max-width: 70ch; line-height: 1.6; }
button { font: inherit; padding: 12px 20px; border: 2px solid #ffadc2; border-radius: 8px; background: #354575; color: #fff9ec; cursor: pointer; }
button:focus-visible, summary:focus-visible { outline: 3px solid #a6d9d4; outline-offset: 4px; }
#status { margin-left: 12px; }
main { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr)); gap: 24px; }
article { border-top: 1px solid #918983; min-width: 0; padding-top: 8px; }
h2 { margin: 12px 0; font-size: 1.2rem; }
.poses { display: flex; align-items: end; flex-wrap: wrap; gap: 16px; }
figure { margin: 0; }
img { image-rendering: pixelated; object-fit: contain; background: #25232e; }
.large { width: 192px; height: 160px; }
.native { width: 48px; height: 40px; }
figcaption, .timing { color: #ded6c7; font-size: .85rem; margin: 6px 0 12px; }
summary { cursor: pointer; padding: 12px 0; }
.frames { display: flex; flex-wrap: wrap; gap: 12px; }
.frames figure { width: 100px; overflow-wrap: anywhere; }
.frames img { width: 96px; height: 80px; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
</style>
<header>
<h1>One pet, 24 reactions</h1>
<p>Pink bows, a blue floral bandana, and the approved 48 × 40 canvas. Compare the native sprite with its 4× view; expand a state to inspect every frame. Playback uses the shipped frame intervals, intro order and cycle modes. The rejected verification result is shown separately, never looped.</p>
<button id="pause" type="button" aria-pressed="false">Pause animations</button><span id="status" role="status"></span>
<p>145 transparent PNGs · no alternate YOLO character · original widget sizing and cycle lengths.</p>
</header>
<main aria-label="Pet animation states"></main>
<script>
const states = __STATES__;
const config = __CONFIG__;
const motion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = motion.matches;
const button = document.querySelector('#pause');
function feedback() {
  button.textContent = paused ? 'Play animations' : 'Pause animations';
  button.setAttribute('aria-pressed', String(paused));
  document.querySelector('#status').textContent = paused ? 'Paused' : 'Playing';
}
button.addEventListener('click', () => { paused = !paused; feedback(); });
motion.addEventListener('change', () => { paused = motion.matches; feedback(); });
feedback();
const players = [];
for (const state of states) {
  const article = document.createElement('article');
  const title = document.createElement('h2'); title.textContent = state.name;
  article.append(title);
  const poses = document.createElement('div'); poses.className = 'poses';
  const views = [];
  for (const [cls, label] of [['large', '4× · nearest-neighbour'], ['native', 'Native · 48 × 40']]) {
    const figure = document.createElement('figure');
    const img = document.createElement('img'); img.className = cls; img.width = cls === 'large' ? 192 : 48; img.height = cls === 'large' ? 160 : 40;
    img.alt = `${state.name} pet animation`; figure.append(img); views.push(img);
    const caption = document.createElement('figcaption'); caption.textContent = label; figure.append(caption); poses.append(figure);
  }
  article.append(poses);
  const ms = config.frameMs[state.name] ?? (state.name === 'talk' ? 120 : 500);
  const timing = document.createElement('p'); timing.className = 'timing';
  timing.textContent = state.name === 'idle' ? 'Blink example · 3000 ms rest, 150 ms blink' : `${ms} ms / frame · ${config.cycle[state.name] ?? 'loop'}`;
  article.append(timing);
  const details = document.createElement('details');
  const summary = document.createElement('summary'); summary.textContent = `Inspect ${state.frames.length} frames`; details.append(summary);
  const frames = document.createElement('div'); frames.className = 'frames';
  for (const frame of state.frames) {
    const figure = document.createElement('figure');
    const img = document.createElement('img'); img.src = frame.src; img.alt = `${state.name}/${frame.name}`; img.width = 96; img.height = 80; figure.append(img);
    const caption = document.createElement('figcaption'); caption.textContent = frame.name; figure.append(caption); frames.append(figure);
  }
  details.append(frames); article.append(details); document.querySelector('main').append(article);
  let intro = state.frames.filter(f => f.name.startsWith('in_'));
  let loop = state.frames.filter(f => !f.name.startsWith('in_') && !(state.name === 'verify' && f.name === 'fail.png'));
  if (state.name === 'talk') loop = loop.flatMap(f => Array(config.talk.weights[f.name] ?? 1).fill(f));
  if (config.cycle[state.name] === 'pingpong') loop = [...loop, ...loop.slice(1, -1).reverse()];
  let index = 0, elapsed = 0;
  function current() { return index < intro.length ? intro[index] : loop[(index - intro.length) % loop.length]; }
  function show() { for (const img of views) img.src = current().src; }
  show();
  players.push(delta => {
    elapsed += delta;
    const duration = state.name === 'idle' ? (index % 2 === 0 ? 3000 : 150) : ms;
    if (elapsed >= duration) { elapsed %= duration; index++; show(); }
  });
}
let previous = performance.now();
function tick(now) {
  const delta = Math.min(now - previous, 100); previous = now;
  if (!paused) for (const advance of players) advance(delta);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
</script>
</html>
'''
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(template.replace('__STATES__', json.dumps(states)).replace('__CONFIG__', json.dumps(contract['emotes'])))
    print(f'gallery: {len(states)} animations, {sum(len(s["frames"]) for s in states)} embedded PNGs → {OUT}')


if __name__ == '__main__':
    build()
