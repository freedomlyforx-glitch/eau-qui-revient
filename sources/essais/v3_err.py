import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 960, 540)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(int(sys.argv[1]) if len(sys.argv) > 1 else 5000)
        print('\n'.join(l[:700] for l in logs[:25]))
        await b.close()
asyncio.run(main())
