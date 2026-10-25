"""Generate the original Daymark alarm-clock assets without external dependencies."""
from pathlib import Path
import math
import struct
import zlib

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT / 'build'


def png(size, transparent=False):
    rows = []

    def segment(x, y, ax, ay, bx, by):
        t = max(0, min(1, ((x-ax)*(bx-ax)+(y-ay)*(by-ay))/((bx-ax)**2+(by-ay)**2)))
        return math.hypot(x-ax-t*(bx-ax), y-ay-t*(by-ay))

    for y in range(size):
        row = bytearray()
        for x in range(size):
            total = [0]*4
            for ox, oy in [(0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)]:
                a, b = (x+ox)*256/size, (y+oy)*256/size
                dx, dy = max(31-a, 0, a-225), max(31-b, 0, b-225)
                color = (255, 255, 255, 255) if not transparent and dx*dx+dy*dy < 31**2 else (0, 0, 0, 0)
                ring = abs(math.hypot(a-128, b-141)-64) < 6
                hands = segment(a,b,128,104,128,141) < 5 or segment(a,b,128,141,154,155) < 5
                bells = ((a-77)**2/27**2+(b-66)**2/16**2 < 1 and b < 80) or ((a-179)**2/27**2+(b-66)**2/16**2 < 1 and b < 80)
                legs = segment(a,b,88,193,78,210) < 5 or segment(a,b,168,193,178,210) < 5
                if ring or hands or bells or legs:
                    color = (32, 35, 39, 255)
                for index, value in enumerate(color):
                    total[index] += value
            row.extend(round(value/4) for value in total)
        rows.append(b'\0'+row)

    def chunk(tag, value):
        return struct.pack('>I', len(value))+tag+value+struct.pack('>I', zlib.crc32(tag+value)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')


OUTPUT.mkdir(exist_ok=True)
sizes = [16, 24, 32, 48, 64, 128, 256, 512, 1024]
images = {size: png(size) for size in sizes}
ico_sizes = sizes[:7]
offset = 6+16*len(ico_sizes)
entries = []
for size in ico_sizes:
    content = images[size]
    entries.append(struct.pack('<BBBBHHII',size%256,size%256,0,0,1,32,len(content),offset))
    offset += len(content)
(OUTPUT/'icon.ico').write_bytes(struct.pack('<HHH',0,1,len(ico_sizes))+b''.join(entries)+b''.join(images[size] for size in ico_sizes))
icns = b''.join(tag+struct.pack('>I',len(images[size])+8)+images[size] for tag,size in [(b'icp4',16),(b'icp5',32),(b'icp6',64),(b'ic07',128),(b'ic08',256),(b'ic09',512),(b'ic10',1024)])
(OUTPUT/'icon.icns').write_bytes(b'icns'+struct.pack('>I',len(icns)+8)+icns)
(OUTPUT/'icon.png').write_bytes(images[256])
(OUTPUT/'tray.png').write_bytes(images[32])
(OUTPUT/'trayTemplate.png').write_bytes(png(32,True))
print('Generated Windows, macOS and tray icons.')
