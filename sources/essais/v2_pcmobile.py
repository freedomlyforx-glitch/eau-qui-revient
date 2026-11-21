import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 844, 390, mobile=True)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('mobile')")
        await pg.wait_for_timeout(300)
        await pg.evaluate("window.__dbg.startGame()")
        await pg.wait_for_timeout(800)
        await pg.evaluate("(() => { const d = window.__dbg; d.P.pos.set(-104.2, 0.34, -4.3); d.enterPC(); d.step(40, 0.05); })()")
        await pg.wait_for_timeout(6000)
        fr = pg.frames[1] if len(pg.frames) > 1 else None
        print('frames', len(pg.frames), fr.url if fr else None)
        if fr:
            await fr.evaluate("document.getElementById('entrer').click()")
            await pg.wait_for_timeout(2500)
            info = await fr.evaluate("JSON.stringify({ui: !document.getElementById('tactileV1').hidden, tactile: document.body.classList.contains('tactile-v1'), aide: document.getElementById('aide').textContent})")
            print(info)
            # pouce gauche : avancer
            box = await pg.evaluate("JSON.stringify(document.querySelector('#pc iframe').getBoundingClientRect())")
            print(box)
            await pg.touchscreen.tap(780, 330)
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=BASE + '/tests/m_pc_v1.png')
        print('\n'.join(logs[:20]))
        await b.close()
asyncio.run(main())
