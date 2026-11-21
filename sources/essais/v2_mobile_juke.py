import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def ev(pg, js):
    return await pg.evaluate("(() => { const d = window.__dbg; " + js + " })()")
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 844, 390, mobile=True)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(5000)
        await pg.tap('#choixMobile')
        await pg.wait_for_timeout(1500)
        await pg.evaluate("document.getElementById('entrer').click()")
        await pg.wait_for_timeout(2000)
        await ev(pg, "const b = d.JUKE.boxes[1]; d.P.pos.set(b.fx, b.y, b.fz); d.P.yaw = b.ang; d.P.pitch = -0.1; d.P.vel.set(0,0,0); d.step(3, 1/60);")
        await pg.wait_for_timeout(1500)
        print('ACTION visible:', await pg.is_visible('#tAction'), await ev(pg, "return JSON.stringify({near: !!d.nearJukebox(), hidden: document.getElementById('tAction').hidden, tactile: document.getElementById('tactile').hidden, gs: d.P.pos.y.toFixed(2), menu: d.JUKE.menu})"))
        try:
            await pg.tap('#tAction', timeout=8000)
        except Exception as e:
            print('tap ACTION impossible:', str(e)[:200]); await ev(pg, "d.openJukeMenu(d.nearJukebox() || d.JUKE.boxes[1]);")
        await pg.wait_for_timeout(1200)
        print('menu ouvert:', await pg.is_visible('#jukeMenu'))
        await pg.screenshot(path=BASE + '/tests/mob_juke_menu.png')
        try:
            await pg.tap('#jukeListe button[data-i="6"]', timeout=8000)
        except Exception as e:
            print('tap disque impossible:', str(e)[:300])
        await pg.wait_for_timeout(2500)
        print(await ev(pg, "return JSON.stringify({cur: d.JUKE.cur, menu: d.JUKE.menu, src: d.JUKE.el.src.slice(-11), paused: d.JUKE.el.paused})"))
        await pg.screenshot(path=BASE + '/tests/mob_juke_jeu.png')
        print([l for l in logs if 'Mixed' not in l][:10])
        await b.close()
asyncio.run(main())
