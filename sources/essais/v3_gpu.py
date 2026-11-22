import asyncio, sys, os, json, statistics
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
from v3_perf import SCENES
# temps complet d'une image en rendu logiciel (calcul + dessin), mesuré image par image en attendant la fin du dessin
async def main():
    names = sys.argv[1:] or ['jetee_nuit']
    N = int(os.environ.get('N', 14))
    async with async_playwright() as p:
        b, ctx = await setup(p, int(os.environ.get('VW', 800)), int(os.environ.get('VH', 360)))
        logs = []
        pg = await ctx.new_page(); pg.set_default_timeout(120000)
        if QUAL: await pg.add_init_script("try{localStorage.setItem('eqr-qualite','" + QUAL + "')}catch(e){}")
        await pg.add_init_script("window.__stop = false; { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => { if (window.__stop) return; cb(t); }); }")
        pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.route('**/*', route); await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        await pg.evaluate("(() => { const d = window.__dbg; d.REV.mode = 'jamais'; window.__stop = true; if (d.WARM && !d.WARM.done) d.warmUp(); })()")
        await pg.wait_for_timeout(1200)
        for name in names:
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P, gl = d.renderer.getContext(); " + SCENES[name] + " P.vel.set(0, 0, 0); d.step(3, 0.03); const px = new Uint8Array(4); for (let i = 0; i < 4; i++) { d.simulate(1 / 60, true); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } })()")
            ts = await pg.evaluate("(() => { const d = window.__dbg, gl = d.renderer.getContext(), ts = [], px = new Uint8Array(4); for (let i = 0; i < %d; i++) { const t0 = performance.now(); d.P.yaw += 0.003; d.simulate(1 / 60, true); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0); } return ts; })()" % N)
            ev = ts[0::2]; od = ts[1::2]
            print('==', name, os.environ.get('SITE'), os.environ.get('QUAL'), '| temps par image (rendu logiciel) : moyenne %.0f ms, médiane %.0f ms | images paires %.0f ms, impaires %.0f ms' % (sum(ts) / len(ts), statistics.median(ts), statistics.median(ev), statistics.median(od)))
        print([l[:200] for l in logs[:3]])
        await b.close()
if __name__ == '__main__': asyncio.run(main())
