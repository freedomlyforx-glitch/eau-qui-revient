import asyncio, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from v2 import *
# capture comme sur un téléphone : écran étroit, forte densité de points, réglage "moyenne"
async def main():
    w, h = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else (412, 860)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle','--autoplay-policy=no-user-gesture-required'])
        ctx = await b.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=2.625)
        logs = []
        pg = await page(ctx, logs)
        await pg.wait_for_timeout(6000)
        await pg.tap('#choixMobile'); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.getElementById('entrer').click()"); await pg.wait_for_timeout(1500)
        steps = open(sys.argv[3]).read().split('\n---\n') if len(sys.argv) > 3 else []
        for s in steps:
            s = s.strip()
            if s.startswith('wait'): await pg.wait_for_timeout(int(s.split()[1]))
            elif s.startswith('shot'): await pg.screenshot(path=BASE + '/tests/d_' + s.split()[1] + '.png')
            elif s:
                r = await pg.evaluate("(() => { const d = window.__dbg; " + s + " })()")
                if r is not None: print(r)
        print('\n'.join(l[:300] for l in logs[:8]))
        await b.close()
asyncio.run(main())
