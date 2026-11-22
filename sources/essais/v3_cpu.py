import asyncio, sys, os, json, statistics
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
from v3_perf import SCENES
# temps de calcul par image sur le fil principal (hors attente de la carte graphique), et part de la simulation seule
INIT = "window.__ft = []; { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => { const t0 = performance.now(); cb(t); window.__ft.push(performance.now() - t0); }); }"
async def main():
    names = sys.argv[1:] or ['jetee_nuit']
    async with async_playwright() as p:
        b, ctx = await setup(p, 160, 90)
        logs = []
        pg = await ctx.new_page(); pg.set_default_timeout(120000)
        if QUAL: await pg.add_init_script("try{localStorage.setItem('eqr-qualite','" + QUAL + "')}catch(e){}")
        await pg.add_init_script(INIT)
        pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.route('**/*', route); await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        for name in names:
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P; " + SCENES[name] + " P.vel.set(0, 0, 0); d.step(3, 0.03); })()")
            await pg.wait_for_timeout(3000); await pg.evaluate("window.__ft.length = 0"); await pg.wait_for_timeout(int(float(os.environ.get('SECS', 14)) * 1000))
            ft = await pg.evaluate("window.__ft.slice()")
            sim = await pg.evaluate("(() => { const d = window.__dbg; const t0 = performance.now(); d.step(120, 1 / 60); return (performance.now() - t0) / 120; })()")
            ft.sort(); n = len(ft)
            print('==', name, os.environ.get('SITE'), os.environ.get('QUAL'), '| images', n, '| fil principal par image : médiane %.1f ms, moyenne %.1f ms, 90e centile %.1f ms' % (statistics.median(ft), sum(ft) / n, ft[int(n * 0.9)]), '| simulation seule %.2f ms' % sim)
        print(logs[:3])
        await b.close()
if __name__ == '__main__': asyncio.run(main())
