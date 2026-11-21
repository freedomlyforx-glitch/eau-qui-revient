import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 960, 540)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        for which, name in ((1, 'lotissement'), (2, 'v1')):
            print(await pg.evaluate("(() => { const d = window.__dbg; d.P.pos.set(-142.3, 7.3, -0.6); d.P.yaw = Math.PI; d.step(3, 0.03); d.updateHint(); const h = d.hint; d.interact(); return h + ' | menu ' + d.PCMENU.open; })()"))
            await pg.evaluate("window.__dbg.pickVersion(%d)" % which)
            for i in range(40):
                ph = await pg.evaluate("(window.__dbg.step(10, 0.05), window.__dbg.PC.phase)")
                if ph == 'dedans': break
            await pg.wait_for_timeout(4000)
            print('phase', ph, [f.url for f in pg.frames][1:])
            fr = [f for f in pg.frames if name in f.url][0]
            await fr.wait_for_load_state('load'); await pg.wait_for_timeout(5000)
            print('titre', await fr.evaluate("document.title + ' | ' + (document.querySelector('.sur-titre') || {}).textContent + ' | dbg ' + (typeof window.__dbg)"))
            if which == 1: await pg.screenshot(path=BASE + '/tests/d_v3_pc.png')
            await fr.evaluate("window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true }))")
            await pg.wait_for_timeout(900)
            for i in range(30):
                ph = await pg.evaluate("(window.__dbg.step(10, 0.05), window.__dbg.PC.phase)")
                if not ph: break
            print('retour', repr(ph), await pg.evaluate("JSON.stringify(window.__dbg.P.pos.toArray().map(v => +v.toFixed(1)))"))
        print('\n'.join(l[:300] for l in logs[:12]))
        await b.close()
asyncio.run(main())
