import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def ev(pg, js):
    return await pg.evaluate("(() => { const d = window.__dbg; " + js + " })()")
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 320, 180)
        la, lb = [], []
        ctx.set_default_navigation_timeout(400000)
        A = await page(ctx, la, 'https://jeu.test/?test-local')
        B = await ctx.new_page(); B.set_default_timeout(400000)
        B.on('pageerror', lambda e: lb.append(f'[pageerror] {e}'))
        await B.route('**/*', route)
        await B.goto('https://jeu.test/?test-local', timeout=400000)
        await A.wait_for_timeout(5000)
        await ev(A, "d.PROFILE.nom='Alice'; d.PROFILE.type='grenouille'; d.PROFILE.langue='fr'; d.chooseDevice('pc'); d.PREP.monde='ligne'; d.PREP.ouvert=true; d.PREP.regle='paisible'; d.startGame();")
        await A.wait_for_timeout(1500)
        await ev(B, "d.PROFILE.nom='Bob'; d.PROFILE.type='axolotl'; d.PROFILE.langue='fr'; d.chooseDevice('pc');")
        await B.click('#mLigne'); await B.wait_for_timeout(5000)
        await B.click('#listeServeurs button'); await B.wait_for_timeout(4000)
        for pg in (A, B): await ev(pg, "d.step(20, 0.05)")
        await A.wait_for_timeout(1500)
        print('A:', await ev(A, "return JSON.stringify({peers:[...d.NET.peers.values()].map(p=>p.nom), host:d.NET.isHost(), t: Math.round(d.TIME.t)})"))
        print('B:', await ev(B, "return JSON.stringify({peers:[...d.NET.peers.values()].map(p=>p.nom), host:d.NET.isHost(), t: Math.round(d.TIME.t)})"))
        # Bob dort : l'heure change chez tout le monde ; Alice tire un feu d'artifice ; Alice monte dans la roue
        await ev(B, "d.P.pos.set(-123.2, 7.3, -8.6); d.step(3, 0.03); d.interact(); d.step(60, 0.05);")
        await A.wait_for_timeout(1200); await ev(A, "d.step(5, 0.05)")
        print('heure A/B:', await ev(A, "return Math.round(d.TIME.t)"), await ev(B, "return Math.round(d.TIME.t)"))
        await ev(A, "d.ACT.tickets = 9; d.P.pos.set(-10, 0.03, -162.1); d.step(3, 0.03); d.interact(); d.step(3, 0.05);")
        await B.wait_for_timeout(1200); await ev(B, "d.step(3, 0.05)")
        print('fusées en file A/B:', await ev(A, "return d.FW.q.length"), await ev(B, "return d.FW.q.length"))
        await ev(A, "d.P.pos.set(0, 0.03, -142); d.step(3, 0.03); d.interact(); d.step(300, 0.05);")
        await B.wait_for_timeout(1500); await ev(B, "d.step(10, 0.05)")
        print('Alice vue par Bob:', await ev(B, "return JSON.stringify([...d.NET.peers.values()].map(p => [p.nom, Math.round(p.x), +p.y.toFixed(1), Math.round(p.z)]))"), 'réelle:', await ev(A, "return JSON.stringify(d.P.pos.toArray().map(v => +v.toFixed(1)))"))
        print('logs A', [l[:200] for l in la[:6]]); print('logs B', [l[:200] for l in lb[:6]])
        await b.close()
asyncio.run(main())
