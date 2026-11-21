import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
# mesure comparative (rendu logiciel) : images rendues en quelques secondes sur une vue fixe
VIEWS = {
  'nuit': "d.setTimeOfDay(430); d.camera.position.set(-46, 1.2, -52); d.camera.lookAt(10, 9, -130);",
  'jour': "d.setTimeOfDay(215); d.camera.position.set(-34, 1.6, -30); d.camera.lookAt(40, 3, -80);",
  'ville': "d.setTimeOfDay(215); d.camera.position.set(-20, 1.7, 22); d.camera.lookAt(30, 4, 60);",
}
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, int(os.environ.get("VW", 960)), int(os.environ.get("VH", 540)))
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        out = {}
        for name in sys.argv[1:]:
            await pg.evaluate("(() => { const d = window.__dbg; d.setState('apercu'); " + VIEWS[name] + " window.__n = 0; const f = () => { window.__n++; requestAnimationFrame(f); }; if (!window.__cnt) { window.__cnt = 1; requestAnimationFrame(f); } })()")
            await pg.wait_for_timeout(2500)
            n0 = await pg.evaluate("window.__n"); await pg.wait_for_timeout(16000); n1 = await pg.evaluate("window.__n")
            pr = await pg.evaluate("window.__dbg.renderer.getPixelRatio()")
            out[name] = [round((n1 - n0) / 16.0, 2), pr]
        print(os.environ.get('SITE'), os.environ.get('QUAL'), out, logs[:2])
        await b.close()
asyncio.run(main())
