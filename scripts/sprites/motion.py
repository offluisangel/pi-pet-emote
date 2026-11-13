"""Pet gestures. Keep the 48x40 canvas and the approved accessories in every pose."""
import pet as art

BASE = bytes(art.pixels)
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


def eyes(mode='open', look=0):
    for x in (16, 27):
        art.ellipse(x, 16, 6, 6, 'muzzle')
        if mode == 'closed':
            line(x+1, 19, x+4, 19, 'eye')
        elif mode == 'happy':
            line(x+1, 19, x+2, 18, 'eye')
            line(x+2, 18, x+4, 19, 'eye')
        elif mode == 'sleepy':
            art.rect(x+1, 19, 4, 2, 'eye')
            art.dot(x+2, 19, 'glint')
        else:
            art.ellipse(x+1+look, 17, 4, 4, 'eye')
            art.dot(x+2+look, 17, 'glint')


def mouth(level=1):
    art.ellipse(20, 23, 9, 4, 'muzzle')
    if level:
        art.ellipse(22, 23, 5, min(5, level+2), 'nose')
        art.rect(23, 25, 3, min(3, level), 'pink')
        art.dot(24, 25, 'pinklight')
    else:
        line(22, 25, 26, 25, 'nose')


def tail(n):
    art.ellipse(36+n % 2, 29-n % 3, 7, 5, 'shadow')
    art.ellipse(37+n % 2, 29-n % 3, 5, 3, 'light')


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


def translate(dx=0, dy=0, head_only=False):
    source = bytes(art.pixels)
    if head_only:
        for y in range(27):
            art.pixels[y*art.W*4:(y+1)*art.W*4] = bytes(art.W*4)
    else:
        art.pixels[:] = bytes(art.W*art.H*4)
    for y in range(27 if head_only else art.H):
        for x in range(art.W):
            xx, yy = x+dx, y+dy
            if 0 <= xx < art.W and 0 <= yy < art.H:
                i=(y*art.W+x)*4
                if source[i+3]:
                    j=(yy*art.W+xx)*4
                    art.pixels[j:j+4]=source[i:i+4]


def render(state, name, index):
    art.pixels[:] = BASE
    n = index
    if state == 'idle':
        if 'blink' in name:
            eyes('closed')
    elif state == 'hi':
        if name.startswith('in_'):
            mouth(1 if n % 2 else 0)
            translate(dx=(-4,-3,-2,-1,0,0)[n], dy=(-1,-2,-1,0,-1,0)[n])
        else:
            eyes('happy')
            mouth(1)
            tail(n)
            paw(38,21+(n % 2)*4)
    elif state == 'think':
        eyes(look=(-1 if n == 0 else 1))
        paw(30,24+n)
        art.ellipse(40,5+n,4,4,'paper')
        art.dot(38,11+n,'paper')
    elif state == 'talk':
        level={'talk_close.png':0,'talk_small.png':1,'talk_mid.png':2,'talk_wide.png':3}[name]
        mouth(level)
        if level == 3:
            eyes('happy')
    elif state == 'read':
        eyes(look=(-1,0,1)[n])
        book(n)
    elif state == 'write':
        eyes(look=1 if n % 2 else 0)
        paper()
        x=24+n*2
        line(x,34,x+5,27,'wood')
        line(x,34,x+1,33,'nose')
        paw(x+1,29)
    elif state == 'tool':
        eyes(look=1)
        x=37+(n % 2)
        art.rect(x,26,2,10,'ink')
        art.ellipse(x-2,23,6,5,'ink')
        art.rect(x,22,2,3,'blueedge')
        paw(34,31-n)
    elif state == 'success':
        eyes('happy')
        mouth(1)
        tail(n)
        star(4,9+n*3)
        star(43,18-n*5,'pinklight')
        badge()
    elif state == 'failure':
        eyes('sleepy')
        translate(dx=(-1,0,1)[n],head_only=True)
        art.rect(32,21+n,1,3,'mint')
        badge(False)
    elif state == 'compact':
        eyes(look=-1 if n == 1 else 0)
        for j in range(3):
            art.rect(14+j*(5-n),34-j,12,2,'ink' if j % 2 else 'paper')
        paw(10+n,32)
        paw(33-n,32)
    elif state == 'ask':
        translate(dy=-1 if n else 0,head_only=True)
        art.rect(41,3,3,1,'gold')
        art.dot(44,4,'gold')
        art.dot(43,5,'gold')
        art.dot(42,6,'gold')
        art.dot(42,8,'gold')
        if n:
            eyes(look=1)
    elif state == 'grandma':
        # The old inactivity state now means a sleepy pet, not a second character.
        eyes('sleepy' if name.startswith('in_') else 'closed')
        art.ellipse(9,35,31,5,'bluelight')
        if name.startswith('knit_'):
            x=38+n % 2
            art.rect(x,3,5,1,'paper')
            line(x+4,4,x,7,'paper')
            art.rect(x,8,5,1,'paper')
        else:
            translate(dy=n % 2,head_only=True)
    elif state == 'bye':
        eyes('happy')
        tail(n)
        paw(38,22+(n % 2)*4)
        heart(2,3+(n % 2)*2)
        if name.startswith('in_'):
            mouth(n % 2)
    elif state == 'delegate':
        eyes(look=(-1,0,1)[n])
        # Small paw-print task tokens; still only one pet.
        for j in range(n+1):
            x=3+j*5
            art.ellipse(x,32,3,3,'pinklight')
            art.dot(x,30,'pink')
            art.dot(x+2,30,'pink')
        paw(35,29-n)
    elif state == 'jobs':
        eyes('sleepy' if n == 1 else 'open')
        art.ellipse(36,28,10,10,'blueedge')
        art.ellipse(37,29,8,8,'paper')
        line(40,33,40,30,'ink')
        line(40,33,43 if n % 2 else 38,34 if n % 2 else 32,'ink')
        art.dot(37+n,37,'pink')
    elif state == 'remember':
        eyes('closed' if n else 'open')
        heart(2,3+n*2)
        paw(29,25+n)
    elif state in ('yolo','super-yolo'):
        eyes('closed' if 'blink' in name else 'happy')
        mouth(1)
        tail(n)
        star(4,9+n*2,'pinklight')
        if state == 'super-yolo':
            star(43,4+n*2)
            star(43,22-n*2,'mint')
        else:
            star(43,18-n*2)
    elif state == 'explore':
        eyes(look=(-1,0,1)[n])
        x=34+n
        art.ellipse(x,23,9,9,'wood')
        art.ellipse(x+1,24,7,7,'mint')
        art.ellipse(x+2,25,5,5,'blueedge')
        art.dot(x+3,25,'glint')
        line(x+2,31,x,36,'wood')
        paw(32,32)
    elif state == 'build':
        eyes(look=1)
        for j in range(n+1):
            art.rect(34+(j % 2)*3,36-j*3,8,3,'wood')
            art.rect(35+(j % 2)*3,36-j*3,6,1,'gold')
        paw(34,27+n*2)
    elif state == 'verify':
        eyes('sleepy' if name == 'fail.png' else 'open', look=1)
        paper(13,32)
        badge(name != 'fail.png')
        if name != 'fail.png':
            art.rect(16,33+n % 3,8,1,'green')
            paw(9,30+n % 2)
    elif state == 'judge':
        eyes('closed' if n else 'open')
        art.rect(38,26+n*2,2,9,'wood')
        art.rect(35,24+n*2,8,4,'wood')
        art.rect(34,36,11,2,'outline')
        paw(34,30+n)
    elif state == 'review':
        eyes(look=-1 if n % 2 else 0)
        paper(13,32)
        art.rect(16,33+n,10,1,'pinkdark')
        paw(31,30+n % 2)
    elif state == 'jira':
        eyes(look=(-1,0,1)[n])
        for j in range(3):
            art.rect(11+j*9,33,7,6,'blueedge')
            art.rect(12+j*9,34,5,2,'gold' if j == n else 'ink')
        paw(11+n*9,30)
    else:
        raise ValueError(f'Unknown state: {state}')
    return art.encode(art.W, art.H, art.pixels)
