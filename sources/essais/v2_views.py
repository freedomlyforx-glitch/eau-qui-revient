import asyncio, sys, json
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
VIEWS = json.loads(open(sys.argv[1]).read()) if len(sys.argv) > 1 else []
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(5000)
        await pg.screenshot(path=BASE + '/tests/s_accueil.png')
        await pg.evaluate("window.__dbg.chooseDevice('pc')")
        await pg.wait_for_timeout(1500)
        await pg.screenshot(path=BASE + '/tests/s_prep.png')
        await pg.evaluate("window.__dbg.startGame()")
        await pg.wait_for_timeout(1500)
        for v in VIEWS:
            await pg.evaluate("(() => { const d = window.__dbg; " + v['js'] + " })()")
            await pg.wait_for_timeout(v.get('wait', 3000))
            await pg.screenshot(path=BASE + '/tests/s_' + v['name'] + '.png')
        info = await pg.evaluate("(() => { const r = window.__dbg.renderer.info; return [r.render.calls, r.render.triangles, r.programs.length]; })()")
        print('calls/tris/programs', info)
        print('\n'.join(logs[:40]))
        await b.close()
asyncio.run(main())
