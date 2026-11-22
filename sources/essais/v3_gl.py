import asyncio, sys, os, json, statistics
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
from v3_perf import SCENES
# deux mesures qui ne dépendent pas de la carte graphique du bac à sable :
#  1. le nombre exact d'ordres envoyés à la carte graphique par image (par famille)
#  2. le temps de calcul pur du programme par image, ordres graphiques neutralisés (médiane sur 240 images)
INIT = r"""
window.__gl = { n: {}, off: false, fr: 0 };
(() => {
  const G = window.__gl;
  const PASS = /^(create|get|is|check|fence|clientWait|readPixels|makeXR|commit)/;
  for (const proto of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) {
    if (!proto) continue;
    for (const k of Object.getOwnPropertyNames(proto)) {
      const d = Object.getOwnPropertyDescriptor(proto, k);
      if (!d || typeof d.value !== 'function' || k === 'constructor') continue;
      const f = d.value, pass = PASS.test(k);
      proto[k] = function () { G.n[k] = (G.n[k] || 0) + 1; if (G.off && !pass) return; return f.apply(this, arguments); };
    }
  }
  const raf = window.requestAnimationFrame.bind(window); G.raf = raf;
  window.requestAnimationFrame = (cb) => raf((t) => { if (G.stop) return; G.fr++; cb(t); });
})();
"""
FAM = [('dessins', ('drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements')), ('valeurs envoyées aux matières', ('uniform',)), ('liaisons (textures, tampons, programmes)', ('bind', 'useProgram', 'activeTexture')), ('envois de données', ('bufferData', 'bufferSubData', 'texImage2D', 'texSubImage2D')), ('états', ('enable', 'disable', 'blend', 'depth', 'cullFace', 'frontFace', 'viewport', 'scissor', 'colorMask', 'clear', 'polygonOffset', 'stencil', 'lineWidth'))]
async def main():
    names = sys.argv[1:] or ['jetee_nuit']
    async with async_playwright() as p:
        b, ctx = await setup(p, int(os.environ.get('VW', 160)), int(os.environ.get('VH', 90)))
        logs = []
        pg = await ctx.new_page(); pg.set_default_timeout(120000)
        if QUAL: await pg.add_init_script("try{localStorage.setItem('eqr-qualite','" + QUAL + "')}catch(e){}")
        await pg.add_init_script(INIT)
        pg.on('pageerror', lambda e: logs.append(str(e)))
        pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
        await pg.route('**/*', route); await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('" + os.environ.get('DEV', 'pc') + "')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        out = {}
        for name in names:
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P; " + SCENES[name] + " P.vel.set(0, 0, 0); d.step(3, 0.03); })()")
            await pg.wait_for_timeout(3500)
            await pg.evaluate("window.__gl.n = {}; window.__gl.fr = 0; if (!window.__rot) { window.__rot = 1; const f = () => { window.__dbg.P.yaw += 0.004; window.__gl.raf(f); }; window.__gl.raf(f); }")
            nfr = int(os.environ.get('FR', 8))
            for _ in range(200):
                await pg.wait_for_timeout(250)
                if await pg.evaluate("window.__gl.fr") >= nfr: break
            st = await pg.evaluate("({ n: window.__gl.n, fr: window.__gl.fr, tri: 0 })")
            fr = max(1, st['fr']); n = st['n']; tot = sum(n.values())
            line = []
            for lab, keys in FAM:
                v = sum(c for k, c in n.items() if any(k.startswith(x) for x in keys)); line.append('%s %.0f' % (lab, v / fr))
            print('==', name, os.environ.get('SITE'), os.environ.get('QUAL'), '| images', fr, '| ordres graphiques par image : %.0f' % (tot / fr), '|', ' · '.join(line))
            if os.environ.get('DETAIL'):
                for k, c in sorted(n.items(), key=lambda x: -x[1])[:22]: print('      %-28s %.1f' % (k, c / fr))
            out[name] = {'ordres': tot / fr}
        # temps de calcul pur : on coupe la boucle normale et on neutralise les ordres graphiques
        for name in names:
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P; window.__gl.stop = true; window.__gl.off = false; " + SCENES[name] + " P.vel.set(0, 0, 0); d.step(3, 0.03); d.simulate(1 / 60, true); d.simulate(1 / 60, true); })()")
            await pg.wait_for_timeout(1500)
            res = await pg.evaluate("(() => { const d = window.__dbg; window.__gl.off = true; for (let i = 0; i < 40; i++) d.simulate(1 / 60, true); const ts = []; for (let k = 0; k < 30; k++) { const t0 = performance.now(); for (let i = 0; i < 20; i++) { d.P.yaw += 0.002; d.simulate(1 / 60, true); } ts.push((performance.now() - t0) / 20); } const t1 = performance.now(); for (let i = 0; i < 100; i++) d.simulate(1 / 60, false); const sim = (performance.now() - t1) / 100; window.__gl.off = false; return { ts, sim }; })()")
            ts = sorted(res['ts'])
            print('==', name, '| calcul pur par image : médiane %.2f ms (meilleur quart %.2f, min %.2f) | dont simulation %.2f ms' % (statistics.median(ts), ts[len(ts) // 4], ts[0], res['sim']))
            out[name]['ms'] = statistics.median(ts)
        if os.environ.get('PROFIL'):
            name = names[0]; N = int(os.environ.get('NPROF', 300))
            cdp = await ctx.new_cdp_session(pg)
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P; window.__gl.off = false; " + SCENES[name] + " P.vel.set(0, 0, 0); d.step(3, 0.03); d.simulate(1 / 60, true); d.simulate(1 / 60, true); })()")
            await pg.wait_for_timeout(1200)
            await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {'interval': 100}); await cdp.send('Profiler.start')
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P; window.__gl.off = true; for (let i = 0; i < %d; i++) { P.yaw += 0.002; d.simulate(1 / 60, true); } window.__gl.off = false; })()" % N)
            prof = (await cdp.send('Profiler.stop'))['profile']
            nodes = {n['id']: n for n in prof['nodes']}
            self_t = {}; tot_t = {}
            parent = {}
            for n in prof['nodes']:
                for c in n.get('children', []): parent[c] = n['id']
            def key(n): cf = n['callFrame']; return (cf['functionName'] or '(anonyme)') + ':' + str(cf.get('lineNumber', 0))
            for nid, dt in zip(prof.get('samples', []), prof.get('timeDeltas', [])):
                n = nodes[nid]; k = key(n); self_t[k] = self_t.get(k, 0) + dt
                seen = set(); cur = nid
                while cur is not None:
                    kk = key(nodes[cur])
                    if kk not in seen: seen.add(kk); tot_t[kk] = tot_t.get(kk, 0) + dt
                    cur = parent.get(cur)
            skip = ('(idle)', '(root)')
            print('-- profil du calcul pur,', name, ': propre (ms/image)')
            for k, v in sorted(self_t.items(), key=lambda x: -x[1])[:int(os.environ.get('TOP', 45))]:
                if k.split(':')[0] in skip: continue
                print('   %6.3f  %s' % (v / 1000 / N, k))
            print('-- cumulé (ms/image)')
            for k, v in sorted(tot_t.items(), key=lambda x: -x[1])[:int(os.environ.get('TOP2', 60))]:
                if k.split(':')[0] in skip: continue
                print('   %6.3f  %s' % (v / 1000 / N, k))
        print(json.dumps(out)); print([l[:300] for l in logs[:4]])
        await b.close()
if __name__ == '__main__': asyncio.run(main())
