import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 960, 540)
        logs = []
        pg = await page(ctx, logs, sys.argv[1])
        await pg.wait_for_timeout(6000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(300)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(2500)
        if len(sys.argv) > 2: await pg.screenshot(path=BASE + '/tests/d_' + sys.argv[2] + '.png')
        print('\n'.join(l[:500] for l in logs[:12]) or 'aucune erreur')
        await b.close()
asyncio.run(main())
