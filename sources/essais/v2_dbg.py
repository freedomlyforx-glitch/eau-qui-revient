import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
SCRIPT = open(sys.argv[1]).read()
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, int(__import__("os").environ.get("VW", 960)), int(__import__("os").environ.get("VH", 540)))
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')")
        await pg.wait_for_timeout(500)
        await pg.evaluate("window.__dbg.startGame()")
        await pg.wait_for_timeout(1000)
        for line in SCRIPT.split('\n---\n'):
            line = line.strip()
            if not line: continue
            if line.startswith('wait '): await pg.wait_for_timeout(int(line[5:])); continue
            if line.startswith('shot '): await pg.screenshot(path=BASE + '/tests/d_' + line[5:] + '.png'); continue
            r = await pg.evaluate("(() => { const d = window.__dbg; " + line + " })()")
            if r is not None: print(r)
        print('\n'.join(logs[:30]))
        await b.close()
asyncio.run(main())
