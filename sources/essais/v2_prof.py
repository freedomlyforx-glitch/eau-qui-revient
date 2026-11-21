import asyncio, sys, time, json
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 640, 360)
        pg = await ctx.new_page()
        await pg.route('**/*', route)
        await pg.goto('http://jeu.test/prof.html', wait_until='load')
        m = json.loads(await pg.evaluate("JSON.stringify(window.__marks)"))
        agg = {}
        for i in range(len(m) - 1): agg[m[i][0]] = agg.get(m[i][0], 0) + m[i+1][1] - m[i][1]
        out = sorted([(round(v), k) for k, v in agg.items()], reverse=True)
        print(out[:16], 'total', round(m[-1][1] - m[0][1]))
        await b.close()
asyncio.run(main())
