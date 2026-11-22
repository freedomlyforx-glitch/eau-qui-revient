import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
from v3_perf import SCENES
# détail par passe de rendu : combien d'appels de dessin et de triangles pour chaque appel à render()
async def main():
    names = sys.argv[1:] or ['jetee_nuit']
    async with async_playwright() as p:
        b, ctx = await setup(p, 320, 180)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        for name in names:
            r = await pg.evaluate("""(async () => { const d = window.__dbg, P = d.P; """ + SCENES[name] + """ P.vel.set(0, 0, 0); d.step(3, 0.03);
              const r = d.renderer, ri = r.info; ri.autoReset = false;
              if (!window.__wr) { window.__wr = 1; window.__log = []; const orig = r.render.bind(r); r.render = (s, c) => { const c0 = ri.render.calls, t0 = ri.render.triangles; orig(s, c); const rt = r.getRenderTarget(); window.__log.push([c.isOrthographicCamera ? 'plein-ecran' : (c === d.camera ? 'camera(masque ' + c.layers.mask + ')' : (c === d.REFL.cam ? 'reflet' : (d.LSH && c === d.LSH.cam ? 'ombre-lampe' : 'autre'))), rt ? rt.width + 'x' + rt.height : 'ecran', ri.render.calls - c0, ri.render.triangles - t0]); }; }
              await new Promise((res) => setTimeout(res, 2500)); window.__log.length = 0; ri.reset();
              await new Promise((res) => { let n = 0; const f = () => { if (++n > 4) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
              return window.__log.slice(0, 60); })()""")
            print('==', name, os.environ.get('SITE'), os.environ.get('QUAL'))
            for e in r: print('   ', e)
        await b.close()
if __name__ == '__main__': asyncio.run(main())
