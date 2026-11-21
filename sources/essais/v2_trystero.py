import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def ev(pg, js):
    return await pg.evaluate("(() => { const d = window.__dbg; " + js + " })()")
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 800, 450)
        logs = []
        pg = await page(ctx, logs, 'https://jeu.test/')
        await pg.wait_for_timeout(4000)
        await ev(pg, "d.chooseDevice('pc')")
        await pg.click('#mLigne')
        await pg.wait_for_timeout(3000)
        print('lobby:', await ev(pg, "return JSON.stringify({lobby: !!d.NET.lobby, self: d.NET.selfId, trystero: typeof Trystero})"))
        await ev(pg, "d.PREP.ouvert=false; d.startGame()")
        await pg.wait_for_timeout(3000)
        print('serveur:', await ev(pg, "return JSON.stringify({on: d.NET.on, sid: d.NET.server && d.NET.server.sid, hash: location.hash})"))
        print('\n'.join(l for l in logs if 'pageerror' in l or 'TypeError' in l)[:2000])
        await b.close()
asyncio.run(main())
