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

def chunk(tag, data):
    return struct.pack('>I',len(data)) + tag + data + struct.pack('>I',zlib.crc32(tag+data)&0xffffffff)


def encode(w,h,data):
    scan = b''.join(b'\0'+data[y*w*4:(y+1)*w*4] for y in range(h))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(scan))+chunk(b'IEND',b'')
