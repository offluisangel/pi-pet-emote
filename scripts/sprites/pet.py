"""Approved pet pixel drawing and dependency-free RGBA PNG encoder."""
import struct
import zlib

W, H = 48, 40
pixels = bytearray(W * H * 4)
PALETTE = {
    'outline': '#514a49', 'ear': '#918983', 'earlight': '#b8afa5',
    'shadow': '#b9b1a5', 'fur': '#ded6c7', 'light': '#f4eddf',
    'white': '#fff9ec', 'muzzle': '#837b75', 'darkfur': '#66605c',
    'eye': '#27282b', 'nose': '#343236', 'glint': '#ffffff',
    'pinkdark': '#ad365e', 'pink': '#ed6994', 'pinklight': '#ffadc2',
    'blueedge': '#22294d', 'blue': '#354575', 'bluelight': '#536797',
    'flower': '#d9b3dc', 'mint': '#a6d9d4',
}

def dot(x, y, color):
    if 0 <= x < W and 0 <= y < H:
        rgba = bytes.fromhex(PALETTE.get(color, color).lstrip('#')) + b'\xff'
        i = (y * W + x) * 4
        pixels[i:i+4] = rgba


def rect(x, y, w, h, color):
    for yy in range(y, y+h):
        for xx in range(x, x+w):
            dot(xx, yy, color)


def poly(points, color):
    for y in range(min(p[1] for p in points), max(p[1] for p in points)+1):
        for x in range(min(p[0] for p in points), max(p[0] for p in points)+1):
            inside = False
            j = len(points)-1
            for i, (xi, yi) in enumerate(points):
                xj, yj = points[j]
                if (yi > y+.5) != (yj > y+.5) and x+.5 < (xj-xi)*(y+.5-yi)/(yj-yi)+xi:
                    inside = not inside
                j = i
            if inside:
                dot(x, y, color)


def ellipse(x, y, w, h, color):
    for yy in range(y, y+h):
        for xx in range(x, x+w):
            if ((xx+.5-x-w/2)/(w/2))**2 + ((yy+.5-y-h/2)/(h/2))**2 <= 1:
                dot(xx, yy, color)

# Sitting silhouette and soft paws.
ellipse(13, 24, 24, 15, 'outline')
ellipse(14, 24, 22, 14, 'shadow')
ellipse(16, 25, 18, 13, 'fur')
ellipse(17, 27, 13, 9, 'light')
ellipse(12, 34, 10, 5, 'outline')
ellipse(13, 34, 9, 4, 'fur')
ellipse(27, 34, 10, 5, 'outline')
ellipse(27, 34, 9, 4, 'light')
rect(16, 36, 1, 2, 'shadow')
rect(31, 36, 1, 2, 'shadow')

# Low, floppy grey ears behind the round cream head.
poly([(11,9),(7,12),(6,21),(8,26),(13,28),(17,23),(16,12)], 'outline')
poly([(11,10),(8,13),(7,21),(9,25),(13,26),(15,22),(15,13)], 'ear')
poly([(10,14),(9,20),(11,24),(13,23),(13,15)], 'earlight')
poly([(35,9),(40,12),(42,21),(40,26),(35,28),(31,22),(31,12)], 'outline')
poly([(36,11),(39,13),(41,21),(39,25),(35,26),(33,22),(33,13)], 'ear')
poly([(37,14),(39,20),(37,24),(35,23),(35,15)], 'earlight')

# Rounded head with stepped tufts rather than a smooth vector edge.
poly([(13,8),(16,5),(19,5),(20,3),(24,4),(27,3),(30,5),(33,5),
      (36,9),(37,15),(35,22),(32,26),(27,28),(20,28),(15,26),(11,22),(10,15)], 'outline')
poly([(14,8),(17,6),(20,6),(21,4),(24,5),(27,4),(30,6),(32,6),
      (35,9),(36,15),(34,22),(31,25),(27,27),(20,27),(15,25),(12,21),(11,15)], 'fur')
poly([(14,9),(18,7),(21,7),(22,5),(24,7),(27,5),(29,7),(32,8),
      (34,12),(32,16),(27,15),(24,12),(21,15),(15,15),(12,13)], 'light')
poly([(18,7),(20,6),(20,10),(17,13),(15,12)], 'white')
poly([(24,6),(26,5),(28,8),(27,12),(25,14),(24,11)], 'white')
poly([(29,8),(32,9),(34,13),(31,15),(29,13)], 'shadow')
poly([(13,17),(17,15),(21,17),(20,21),(16,23),(13,21)], 'shadow')
poly([(27,17),(31,15),(35,17),(34,22),(30,23),(28,21)], 'shadow')

# Dark, short muzzle and bright eyes; a quiet closed-mouth idle expression.
ellipse(16, 16, 6, 6, 'muzzle')
ellipse(27, 16, 6, 6, 'muzzle')
ellipse(17, 17, 4, 4, 'eye')
ellipse(28, 17, 4, 4, 'eye')
dot(18,17,'glint')
dot(29,17,'glint')
dot(20,20,'earlight')
dot(31,20,'earlight')
ellipse(18, 21, 13, 6, 'muzzle')
ellipse(20, 20, 9, 5, 'darkfur')
poly([(22,20),(27,20),(28,21),(26,23),(23,23),(21,21)], 'nose')
rect(23,20,3,1,'earlight')
rect(24,23,1,2,'nose')
rect(21,25,3,1,'nose')
rect(25,25,3,1,'nose')
dot(20,24,'shadow')
dot(29,24,'shadow')
rect(22,26,5,1,'light')

# Two satin pink bows at the ear roots.
for x, y in [(9,10),(35,10)]:
    poly([(x-3,y-3),(x,y-2),(x+1,y),(x+4,y-3),(x+5,y+1),
          (x+2,y+2),(x+4,y+6),(x+2,y+6),(x,y+2),(x-3,y+2)], 'pinkdark')
    poly([(x-2,y-2),(x,y-1),(x+1,y+1),(x-2,y+1)], 'pink')
    poly([(x+2,y),(x+4,y-2),(x+4,y+1),(x+2,y+2)], 'pink')
    rect(x,y,2,2,'pinklight')
    dot(x-2,y-2,'pinklight')
    rect(x+2,y+3,1,2,'pink')

# Navy triangular bandana with simplified lilac and mint flowers.
poly([(15,27),(22,28),(31,27),(35,30),(29,36),(25,37),(17,32)], 'blueedge')
poly([(16,28),(23,29),(31,28),(33,30),(28,35),(25,36),(18,31)], 'blue')
poly([(16,28),(23,29),(31,28),(30,29),(23,30),(18,30)], 'bluelight')
for x, y, color in [(21,31,'flower'),(28,31,'mint'),(25,34,'flower')]:
    dot(x,y-1,color)
    dot(x-1,y,color)
    dot(x+1,y,color)
    dot(x,y+1,color)
    dot(x,y,'light')


def chunk(tag, data):
    return struct.pack('>I',len(data)) + tag + data + struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)


def encode(w,h,data):
    scan = b''.join(b'\0'+data[y*w*4:(y+1)*w*4] for y in range(h))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(scan))+chunk(b'IEND',b'')
