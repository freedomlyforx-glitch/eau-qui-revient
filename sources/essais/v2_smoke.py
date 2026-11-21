import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(9000)
        await pg.screenshot(path=BASE + '/tests/s_accueil.png')
        print('\n'.join(logs[:40]))
        await b.close()
asyncio.run(main())
