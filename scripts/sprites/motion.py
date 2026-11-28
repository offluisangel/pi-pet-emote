"""Pet gestures. Keep the 48x40 canvas and the approved accessories in every pose."""
import pet as art

from pathlib import Path
import subprocess

# Decode the authoring sheet once with the same RGBA decoder used by Pi.
HERE = Path(__file__).resolve().parent
ATLAS = subprocess.check_output(['node', '--input-type=module', '-e',
    "import {decodePng} from './src/png.ts'; import {readFileSync} from 'node:fs';"
    "process.stdout.write(decodePng(readFileSync(process.argv[1])).data)",
    str(HERE / 'mafe-poses.png')], cwd=HERE.parents[1])

art.PALETTE.update({
    'paper': '#f0e8d8', 'ink': '#758498', 'wood': '#a77856',
    'green': '#83c99c', 'red': '#ed8a86', 'gold': '#f3d281',
})


def line(x0, y0, x1, y1, color):
    steps = max(abs(x1-x0), abs(y1-y0), 1)
    for n in range(steps+1):
        art.dot(round(x0+(x1-x0)*n/steps), round(y0+(y1-y0)*n/steps), color)


def paw(x, y):
    art.ellipse(x, y, 6, 5, 'outline')
    art.ellipse(x+1, y, 5, 4, 'fur')
    art.dot(x+2, y+3, 'shadow')


def star(x, y, color='gold'):
    art.rect(x, y-2, 1, 5, color)
    art.rect(x-2, y, 5, 1, color)


def heart(x, y):
    art.poly([(x,y+1),(x+1,y),(x+3,y+1),(x+4,y),(x+5,y+1),
              (x+5,y+3),(x+2,y+5),(x,y+3)], 'pink')
    art.dot(x+1,y+1,'pinklight')


def paper(x=15, y=32):
    art.rect(x, y, 20, 7, 'outline')
    art.rect(x+1, y, 18, 6, 'paper')
    for yy in (y+2, y+4):
        art.rect(x+3, yy, 12, 1, 'ink')


def book(n):
    art.poly([(11,30),(23,32),(25,32),(38,30),(38,37),(25,39),(23,39),(11,37)], 'blueedge')
    art.poly([(12,31),(23,33),(23,38),(12,36)], 'paper')
    art.poly([(25,33),(37,31),(37,36),(25,38)], 'light')
    for y in (33,35):
        line(14,y,20,y+1,'ink')
        line(28,y+1,35,y,'ink')
    art.rect(23+n,32,1,6,'shadow')
    paw(10,32)
    paw(35,32)


def badge(ok=True):
    art.ellipse(35,27,10,10,'blueedge')
    if ok:
        line(37,32,39,34,'green')
        line(39,34,42,29,'green')
    else:
        line(38,30,42,34,'red')
        line(42,30,38,34,'red')


# Cell numbers run left to right across each eight-column row of the sheet.
# Each strip is choreographed independently; repeated poses are holds or returns.
STRIPS = {
    'ask': [48,49,50,52], 'build': [64,65,66,67,68,69],
    'bye': [24,25,26,27], 'compact': [64,65,66,67,68],
    'delegate': [8,9,10,11,12,13], 'explore': [16,17,18,19,20,21],
    'failure': [40,41,42,43,44,45], 'grandma': [0,1,32,1],
    'hi': [25,26,27,24], 'idle': [0,1], 'jira': [64,65,66,67,68,69],
    'jobs': [56,57,58,59,60,61], 'judge': [56,58,59,60],
    'read': [0,5,1,2,4], 'remember': [48,49,50,51],
    'review': [64,65,66,67,68,69,68,67], 'success': [32,33,34,35],
    'super-yolo': [25,26,24,27], 'think': [48,50,51,52], 'tool': [56,57,58,59,60,61],
    'verify': [48,49,50,52,53,56], 'write': [64,65,66,67,68,69,68,65],
    'yolo': [25,26,24,27], 'talk': [0,4,3,2,5,53],
}


def render(state, name, index):
    prefix = name.split('_')[0]
    strip = STRIPS[state]
    if prefix == 'in':
        strip = {'hi': [8,9,10,11,12,13,14,15,0,2,24,25],
                 'bye': [0,2,24,25], 'grandma': [0,2,5,1,32,1]}[state]
    n = index
    cell = 44 if name == 'fail.png' else strip[n % len(strip)]
    for y in range(art.H):
        start = ((cell//8*40+y)*384 + cell%8*48)*4
        art.pixels[y*192:(y+1)*192] = ATLAS[start:start+192]
    # Keep the project-specific task cues, not just a generic happy/sad loop.
    if state == 'read': book(n//2)
    elif state == 'write':
        x = 24 + n % 4
        line(x,35,x+5,28,'wood'); art.dot(x,35,'nose')
    elif state == 'explore':
        x = 34 + n % 3
        art.ellipse(x,23,9,9,'wood'); art.ellipse(x+1,24,7,7,'mint')
        art.ellipse(x+2,25,5,5,'blueedge'); art.dot(x+3,25,'glint')
        line(x+2,31,x,36,'wood')
    elif state == 'ask':
        art.rect(41,3,3,1,'gold'); art.dot(44,4,'gold'); art.dot(43,5,'gold')
        art.dot(42,6,'gold'); art.dot(42,8,'gold')
    elif state == 'build':
        for j in range(1+n//2):
            art.rect(34+j%2*2,36-j*3,8,3,'wood')
            art.rect(35+j%2*2,36-j*3,6,1,'gold')
    elif state == 'judge':
        art.rect(38,26+n,2,9,'wood'); art.rect(35,24+n,8,4,'wood'); art.rect(34,37,11,2,'outline')
    elif state == 'compact':
        for j in range(3): art.rect(12+j*(5-n),36-j*2,13,2,'ink' if j%2 else 'paper')
    elif state == 'delegate':
        for j in range(1+n//2):
            art.ellipse(3+j*4,32,3,3,'pinklight'); art.dot(3+j*4,30,'pink')
    elif state == 'jobs':
        art.ellipse(36,28,10,10,'blueedge'); art.ellipse(37,29,8,8,'paper')
        line(40,33,40,30,'ink'); line(40,33,*[(41,30),(43,31),(44,33),(42,35),(40,36),(38,35)][n],'ink')
    elif state == 'jira':
        for j in range(3):
            art.rect(11+j*9,33,7,6,'blueedge'); art.rect(12+j*9,34,5,2,'gold' if j==n//2 else 'ink')
    elif state == 'verify': paper(); badge(name != 'fail.png')
    elif state == 'review': art.rect(18,34+n%3,6+n%4,1,'pinkdark')
    elif state == 'remember': heart(3,4+n)
    elif state == 'tool':
        x=36+n%3; line(x,34,x+4,26,'wood'); art.ellipse(x+2,23,6,5,'ink'); art.rect(x+4,22,2,3,'blueedge')
    elif state == 'grandma' and prefix != 'in':
        x,y=37+n,5-n; art.rect(x,y,5,1,'paper'); line(x+4,y+1,x,y+4,'paper'); art.rect(x,y+5,5,1,'paper')
    elif state == 'bye': heart(3,5+n)
    elif state == 'yolo': star(4,10+n,'pinklight')
    elif state == 'super-yolo': star(43,8+n); star(43,21-n,'mint')
    return art.encode(art.W, art.H, art.pixels)
