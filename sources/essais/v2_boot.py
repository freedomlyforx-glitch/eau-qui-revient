import asyncio, sys, time
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 640, 360)
        logs = []
        pg = await ctx.new_page()
        await pg.add_init_script("window.__t0 = performance.now(); document.addEventListener('DOMContentLoaded', () => { window.__dcl = performance.now(); });")
        await pg.route('**/*', route)
        t0 = time.time()
        await pg.goto('http://jeu.test/' + (sys.argv[1] if len(sys.argv) > 1 else ''), wait_until='load')
        print('load', round(time.time() - t0, 1), 's')
        print(await pg.evaluate("JSON.stringify({dcl: window.__dcl, nav: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd, scripts: performance.getEntriesByType('resource').filter(r => r.initiatorType === 'script').map(r => [r.name.split('/').pop(), Math.round(r.duration)])})"))
        await b.close()
asyncio.run(main())
