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
        await pg.wait_for_timeout(6000)
        await pg.screenshot(path=BASE + '/tests/d_v3_mob0.png')
        await pg.tap('#choixMobile'); await pg.wait_for_timeout(2000)
        await pg.evaluate("document.getElementById('entrer').click()"); await pg.wait_for_timeout(2000)
        print(await ev(pg, "d.setTimeOfDay(330); d.P.pos.set(-2.85, 0.03, -52); d.P.yaw = Math.PI / 2; d.P.pitch = 0.2; d.step(3, 0.03); d.updateHint(); const h = d.hint; d.interact(); d.step(5, 0.03); d.interact(); d.step(6, 0.03); d.updateHint(); return h + ' | ' + d.hint + ' | action cachée: ' + document.getElementById('tAction').hidden;"))
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=BASE + '/tests/d_v3_mob1.png')
        print(logs[:10])
        await b.close()
asyncio.run(main())
