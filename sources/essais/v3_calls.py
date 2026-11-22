import asyncio, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
from v3_perf import SCENES
# liste des appels de dessin d'une image : quel objet, quelle matière, dans quelle passe
async def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'jetee_nuit'
    async with async_playwright() as p:
        b, ctx = await setup(p, 320, 180)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.chooseDevice('pc')"); await pg.wait_for_timeout(400)
        await pg.evaluate("window.__dbg.startGame()"); await pg.wait_for_timeout(800)
        r = await pg.evaluate("""(async () => { const d = window.__dbg, P = d.P; """ + SCENES[name] + """ P.vel.set(0, 0, 0); d.step(3, 0.03);
          await new Promise((res) => setTimeout(res, 2500));
          const r = d.renderer, orig = r.renderBufferDirect.bind(r); let cur = []; const frames = [];
          r.renderBufferDirect = (cam, sc, geo, mat, obj, grp) => { const tri = (geo.index ? geo.index.count : (geo.attributes.position ? geo.attributes.position.count : 0)) / 3 * (obj.isInstancedMesh ? obj.count : 1);
            cur.push([mat.isMeshDepthMaterial || mat.isMeshDistanceMaterial ? 'ombre' : (cam === d.camera ? 'vue' + cam.layers.mask : 'autre'), obj.type + (obj.isInstancedMesh ? 'x' + obj.count : ''), mat.type + (mat.map ? '+tex' : '') + (mat.transparent ? '+transp' : ''), obj.name || obj.userData.surface || (obj.parent && obj.parent.name) || '', Math.round(tri), obj.castShadow ? 1 : 0, (() => { if (!geo.boundingSphere) geo.computeBoundingSphere(); const c = geo.boundingSphere.center.clone().applyMatrix4(obj.matrixWorld); return [Math.round(c.x), Math.round(c.y), Math.round(c.z), Math.round(geo.boundingSphere.radius), Math.round(c.distanceTo(d.camera.position))]; })(), (mat.vertexShader || '').slice(0, 40).replace(/\s+/g, ' ')]); orig(cam, sc, geo, mat, obj, grp); };
          await new Promise((res) => { let n = 0; const f = () => { frames.push(cur); cur = []; if (++n > 3) res(); else requestAnimationFrame(f); }; requestAnimationFrame(f); });
          r.renderBufferDirect = orig; frames.sort((a, b) => b.length - a.length); return frames[0]; })()""")
        print('==', name, os.environ.get('SITE'), os.environ.get('QUAL'), 'appels', len(r))
        agg = {}
        for e in r:
            k = (e[0], e[1] if 'x' not in e[1] else e[1].split('x')[0] + 'xN', e[2], e[3])
            a = agg.setdefault(k, [0, 0]); a[0] += 1; a[1] += e[4]
        for k, v in sorted(agg.items(), key=lambda x: (x[0][0], -x[1][0])): print('   %-6s %3d appels %8d tri  %s | %s | %s' % (k[0], v[0], v[1], k[1], k[2], k[3]))
        if os.environ.get('DETAIL'):
            for e in sorted([e for e in r if e[0] == os.environ.get('DETAIL')], key=lambda e: -e[4]): print('     ', e[1], '|', e[2], '|', e[3], '|', e[4], 'tri | centre,rayon,dist', e[6], '|', e[7][:30])
        await b.close()
if __name__ == '__main__': asyncio.run(main())
