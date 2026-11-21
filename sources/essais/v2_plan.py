import asyncio, sys, base64
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
JS = r"""
(() => { const d = window.__dbg; const s = 4;
const W = 258*s, H = 224*s; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
const X = (x) => (x + 110) * s, Z = (z) => (z + 124) * s;
g.fillStyle = '#9fd6a8'; g.fillRect(0,0,W,H);
g.fillStyle = '#c8c0e0'; for (const r of [[-6,6,-74,92],[-92,74,-6,6],[74,113,-46,30]]) g.fillRect(X(r[0]), Z(r[2]), (r[1]-r[0])*s, (r[3]-r[2])*s);
g.beginPath(); g.arc(X(0), Z(-86), 14*s, 0, 7); g.fill();
g.fillStyle = '#5fd8ff'; for (const p of d.pools) g.fillRect(X(p.x0), Z(p.z0), (p.x1-p.x0)*s, (p.z1-p.z0)*s);
for (const h of d.houses) { g.save(); g.translate(X(h.inside.x), Z(h.inside.z)); g.rotate(-h.rot); g.fillStyle = '#ffb0d0'; g.fillRect(-6.4*s,-4.8*s,12.8*s,9.6*s); g.restore(); g.save(); g.translate(X(h.insideG.x), Z(h.insideG.z)); g.rotate(-h.rot); g.fillStyle = '#e090b0'; g.fillRect(-3.2*s,-3.2*s,6.4*s,6.4*s); g.restore(); }
g.fillStyle = '#ff7fbf'; g.fillRect(X(118), Z(-44), 22*s, 66*s);
g.fillStyle = '#7f5fbf'; g.fillRect(X(-106), Z(-6), 10*s, 12*s);
g.fillStyle = '#ffe070'; for (const t of d.TRAMPS || []) { g.beginPath(); g.arc(X(t.d.x), Z(t.d.z), 1.6*s, 0, 7); g.fill(); }
g.fillStyle = '#ffffff'; for (const p of d.PORTALS) { g.beginPath(); g.arc(X(p.x), Z(p.z), 1.2*s, 0, 7); g.fill(); }
g.fillStyle = '#207040'; for (const cr of d.CROWNS) { g.beginPath(); g.arc(X(cr.x), Z(cr.z), 0.8*s, 0, 7); g.fill(); }
g.strokeStyle = 'rgba(0,0,0,0.25)'; g.fillStyle = '#000'; g.font = '14px monospace';
for (let x = -100; x <= 140; x += 20) { g.beginPath(); g.moveTo(X(x),0); g.lineTo(X(x),H); g.stroke(); g.fillText(String(x), X(x)+2, 14); }
for (let z = -120; z <= 100; z += 20) { g.beginPath(); g.moveTo(0,Z(z)); g.lineTo(W,Z(z)); g.stroke(); g.fillText(String(z), 2, Z(z)-2); }
return c.toDataURL('image/png'); })()
"""
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 960, 540)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        url = await pg.evaluate(JS)
        open(BASE + '/tests/plan.png', 'wb').write(base64.b64decode(url.split(',')[1]))
        print('\n'.join(logs[:10]))
        await b.close()
asyncio.run(main())
