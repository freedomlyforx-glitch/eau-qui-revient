import asyncio, os
from playwright.async_api import async_playwright
BASE = os.path.dirname(os.path.abspath(__file__)) + '/..'
LIB = BASE + '/lib/package/'
HTML = open(BASE + '/eau-qui-revient.html', encoding='utf-8').read()
PAGE = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + HTML + '</body></html>'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle'])
        pg = await b.new_page(viewport={'width':1280,'height':720})
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        async def route(r):
            u = r.request.url
            if u.startswith('https://cdn.jsdelivr.net/npm/three@0.147.0/'):
                await r.fulfill(path=LIB + u.split('three@0.147.0/')[1], content_type='application/javascript')
            elif u.startswith('http://jeu.test/'):
                await r.fulfill(body=PAGE, content_type='text/html')
            else: await r.abort()
        await pg.route('**/*', route)
        await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.beginPlay()")
        await pg.evaluate("(() => { const d = window.__dbg; d.P.pos.set(0,0,10); d.P.yaw=0; d.P.pitch=0.1; d.M.pos.set(0,0,3.8); d.M.state='hunt'; d.M.form=1; d.renderer.info.autoReset=false; })()")
        await pg.wait_for_timeout(2500)
        info = await pg.evaluate("(() => { const r = window.__dbg.renderer.info; r.reset(); return new Promise(res => requestAnimationFrame(() => requestAnimationFrame(() => res([r.render.calls, r.render.triangles])))); })()")
        print('calls/tris over ~1 frame:', info)
        await pg.evaluate("(() => { const d = window.__dbg; d.renderer.info.autoReset=true; d.hurtPlayer(); })()")
        await pg.wait_for_timeout(2000)
        await pg.screenshot(path=BASE + '/tests/f_hurt.png')
        await pg.evaluate("(() => { const d = window.__dbg; d.M.pos.set(0,0,3.8); d.M.state='hunt'; d.M.form=1; d.killMonster(); })()")
        await pg.wait_for_timeout(3000)
        await pg.screenshot(path=BASE + '/tests/f_kill.png')
        for l in logs[:30]: print(l[:400])
        await b.close()
asyncio.run(main())
