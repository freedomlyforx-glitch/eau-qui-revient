import asyncio, sys, os, json, statistics
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
from v3_perf import SCENES
# où part le temps de dessin : on coupe un élément à la fois et on mesure la différence (rendu logiciel, image par image)
JS = r"""
(() => {
  const d = window.__dbg, gl = d.renderer.getContext(), px = new Uint8Array(4), sc = d.scene;
  const run = (n) => { const ts = []; for (let i = 0; i < n; i++) { const t0 = performance.now(); d.simulate(1 / 60, true); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0); } return ts.reduce((a, b) => a + b, 0) / n; };
  const find = (f) => { const out = []; sc.traverse((o) => { if (f(o)) out.push(o); }); return out; };
  const hide = (list) => ({ on() { this.v = list.map((o) => o.visible); list.forEach((o) => (o.visible = false)); }, off() { list.forEach((o, i) => (o.visible = this.v[i])); } });
  const bloom = d.composer.passes.find((p) => p.compositeMaterial);
  const V = {
    'mer': hide(find((o) => o.material === d.seaMat)),
    'ciel': hide(find((o) => o.isMesh && o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius === 1200)),
    'sol': hide(find((o) => o.isMesh && o.userData.surface === 'herbe' && !o.isInstancedMesh)),
    'herbe en brins': hide(find((o) => o.isMesh && o.material && o.material.side === 2 && o.geometry.attributes.aOff !== undefined || (d.GRASS && o === d.GRASS.mesh))),
    'halo': { on() { this.s = bloom.render; bloom.render = function () {}; }, off() { bloom.render = this.s; } },
    'ombres': { on() { d.sun.castShadow = false; }, off() { d.sun.castShadow = true; } },
    'tout le décor (reste : ciel, mer, passes)': hide(find((o) => o.isMesh && o.parent && o.material !== d.seaMat && !(o.geometry.type === 'SphereGeometry' && o.geometry.parameters.radius === 1200))),
  };
  run(3); const base = run(8), res = { base: Math.round(base) };
  for (const k in V) { V[k].on(); run(3); const t = run(6); V[k].off(); run(2); res[k] = Math.round(base - t); }
  res.base2 = Math.round(run(6));
  return res;
})()
"""
async def main():
    names = sys.argv[1:] or ['jetee_nuit']
    async with async_playwright() as p:
        b, ctx = await setup(p, int(os.environ.get('VW', 800)), int(os.environ.get('VH', 360)))
        logs = []
        pg = await ctx.new_page(); pg.set_default_timeout(240000)
        if QUAL: await pg.add_init_script("try{localStorage.setItem('eqr-qualite','" + QUAL + "')}catch(e){}")
        await pg.add_init_script("window.__stop = false; { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => raf((t) => { if (window.__stop) return; cb(t); }); }")
        pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.route('**/*', route); await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        await pg.evaluate("(() => { const d = window.__dbg; d.REV.mode = 'jamais'; window.__stop = true; if (d.WARM && !d.WARM.done) d.warmUp(); })()")
        await pg.wait_for_timeout(1000)
        for name in names:
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P; " + SCENES[name] + " P.vel.set(0, 0, 0); d.step(3, 0.03); })()")
            r = await pg.evaluate(JS)
            print('==', name, os.environ.get('SITE'), os.environ.get('QUAL'), json.dumps(r, ensure_ascii=False))
        print([l[:200] for l in logs[:3]])
        await b.close()
if __name__ == '__main__': asyncio.run(main())
