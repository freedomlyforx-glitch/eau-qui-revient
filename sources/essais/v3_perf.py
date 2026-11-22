import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
# profil : appels de dessin, triangles, et fonctions les plus coûteuses (profileur du navigateur)
SCENES = {
  'jetee_nuit': "d.setTimeOfDay(430); P.pos.set(2, 0.03, -30); P.yaw = 0.1; P.pitch = 0.02;",
  'prom_jour': "d.setTimeOfDay(215); P.pos.set(-6, 0, 8); P.yaw = -2.0; P.pitch = 0.02;",
  'ville_jour': "d.setTimeOfDay(215); P.pos.set(-20, 0, 22); P.yaw = 3.6; P.pitch = 0.05;",
  'plage_nuit': "d.setTimeOfDay(430); P.pos.set(-30, d.TH(-30, -20), -20); P.yaw = -0.4; P.pitch = 0.05;",
}
async def main():
    names = sys.argv[1:] or ['jetee_nuit']
    secs = float(os.environ.get('SECS', 12))
    async with async_playwright() as p:
        b, ctx = await setup(p, int(os.environ.get('VW', 480)), int(os.environ.get('VH', 270)))
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        cdp = await ctx.new_cdp_session(pg)
        for name in names:
            await pg.evaluate("(() => { const d = window.__dbg, P = d.P; " + SCENES[name] + " P.vel.set(0, 0, 0); d.step(3, 0.03); const ri = d.renderer.info; ri.autoReset = false; window.__fr = 0; window.__acc = { calls: 0, tris: 0, pts: 0 }; if (!window.__hook) { window.__hook = 1; const f = () => { window.__fr++; window.__acc.calls += ri.render.calls; window.__acc.tris += ri.render.triangles; window.__acc.pts += ri.render.points; ri.reset(); requestAnimationFrame(f); }; requestAnimationFrame(f); } })()")
            await pg.wait_for_timeout(2500)
            await pg.evaluate("window.__fr = 0; window.__acc = { calls: 0, tris: 0, pts: 0 };")
            await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', {'interval': 400}); await cdp.send('Profiler.start')
            await pg.wait_for_timeout(int(secs * 1000))
            prof = (await cdp.send('Profiler.stop'))['profile']
            st = await pg.evaluate("({ fr: window.__fr, acc: window.__acc, mem: (window.__dbg.renderer.info.memory), prog: window.__dbg.renderer.info.programs.length })")
            fr = max(st['fr'], 1)
            print('==', name, os.environ.get('SITE'), os.environ.get('QUAL'), '| images', st['fr'], '| appels/image', round(st['acc']['calls'] / fr), '| triangles/image', round(st['acc']['tris'] / fr), '| points', round(st['acc']['pts'] / fr), '| geometries', st['mem']['geometries'], 'textures', st['mem']['textures'], 'programmes', st['prog'])
            nodes = {n['id']: n for n in prof['nodes']}
            self_t = {}
            dts = prof.get('timeDeltas', []); smp = prof.get('samples', [])
            for nid, dt in zip(smp, dts):
                n = nodes[nid]; cf = n['callFrame']; key = (cf['functionName'] or '(anonyme)') + ':' + str(cf.get('lineNumber', 0))
                self_t[key] = self_t.get(key, 0) + dt
            tot = sum(self_t.values()) or 1
            top = sorted(self_t.items(), key=lambda x: -x[1])[:int(os.environ.get('TOP', 28))]
            for k, v in top: print('   %5.1f%%  %7.1f ms/image  %s' % (100 * v / tot, v / 1000 / fr, k))
        print(logs[:3])
        await b.close()
if __name__ == "__main__": asyncio.run(main())
