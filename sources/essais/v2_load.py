import asyncio, sys, time
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 640, 360)
        for k in range(2):
            logs = []
            pg = await ctx.new_page()
            pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error','warning') else None)
            pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
            await pg.route('**/*', route)
            t0 = time.time()
            await pg.goto('https://jeu.test/?test-local', wait_until='commit')
            for i in range(240):
                ok = await pg.evaluate("!!window.__dbg")
                if ok: break
                await pg.wait_for_timeout(500)
            print('page', k, 'prete en', round(time.time() - t0, 1), 's', ok, logs[:5])
        await b.close()
asyncio.run(main())
