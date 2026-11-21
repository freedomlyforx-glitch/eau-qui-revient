import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def ev(pg, js):
    return await pg.evaluate("(() => { const d = window.__dbg; " + js + " })()")
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 844, 390, mobile=True)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(6000)
        await pg.screenshot(path=BASE + '/tests/mob_accueil.png')
        await pg.tap('#choixMobile')
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path=BASE + '/tests/mob_prep.png')
        await pg.eval_on_selector('#entrer', 'e => e.scrollIntoView()')
        await pg.wait_for_timeout(500)
        print('dessus:', await pg.evaluate("(() => { const r = document.getElementById('entrer').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2); return [r.x, r.y, r.width, r.height, e && (e.id || e.className || e.tagName)]; })()"))
        await pg.evaluate("document.getElementById('entrer').click()")
        await pg.wait_for_timeout(2500)
        print('apres tap', await ev(pg, "return JSON.stringify({prepHidden: document.getElementById('prep').hidden, tactile: !document.getElementById('tactile').hidden})"))
        await ev(pg, "d.P.pos.set(0,0,60); d.P.yaw=0; d.setKills(9); d.M.pos.set(0,0,52); d.M.state='hunt'; d.M.form=1; d.killMonster(d.NET.selfId, true); d.P.pos.set(0, 0, 52.5); d.step(3, 1/60);")
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path=BASE + '/tests/mob_jeu.png')
        print(await ev(pg, "return JSON.stringify({dev: document.body.classList.contains('mobile'), q: localStorage.getItem('eqr-qualite')})"))
        print(logs[:10])
        await b.close()
asyncio.run(main())
