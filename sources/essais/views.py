import asyncio, os
from playwright.async_api import async_playwright
BASE = os.path.dirname(os.path.abspath(__file__)) + '/..'
LIB = BASE + '/lib/package/'
HTML = open(BASE + '/eau-qui-revient.html', encoding='utf-8').read()
PAGE = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}</style></head><body>' + HTML + '</body></html>'
VIEWS = [
  ('pool2', "d.P.pos.set(30.5,0,-12.5); d.P.yaw=-2.6; d.P.pitch=-0.55; d.M.pos.set(0,0,-30);"),
  ('sun',  "d.P.pos.set(2,0,38); d.P.yaw=-0.22; d.P.pitch=0.03; d.M.pos.set(-1,0,8); d.M.state='hunt'; d.M.form=1;"),
  ('monster', "d.P.pos.set(0,0,10); d.P.yaw=0; d.P.pitch=0.12; d.M.pos.set(0,0,3.6); d.M.state='hunt'; d.M.form=1; d.M.hp=100; d.M.cooldown=99;"),
  ('pool', "d.P.pos.set(27.5,0,-1); d.P.yaw=-2.0; d.P.pitch=-0.32; d.M.pos.set(0,0,-30);"),
  ('ads', "d.P.pos.set(0,0,14); d.P.yaw=0; d.P.pitch=0.06; d.M.pos.set(1,0,2); d.M.state='hunt'; d.M.form=1; d.M.cooldown=99; d.aim(true); d.WPN.ads=1;"),
  ('kill', "d.P.pos.set(0,0,10); d.P.yaw=0; d.P.pitch=0.1; d.M.pos.set(0,0,3.8); d.M.state='hunt'; d.M.form=1; d.killMonster();"),
]
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
            else:
                await r.abort()
        await pg.route('**/*', route)
        await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(4000)
        await pg.evaluate("window.__dbg.beginPlay()")
        for name, js in VIEWS:
            await pg.evaluate("(() => { const d = window.__dbg; " + js + " })()")
            await pg.wait_for_timeout(3500 if name != 'kill' else 2500)
            await pg.screenshot(path=BASE + f'/tests/v_{name}.png')
            await pg.evaluate("window.__dbg.aim(false); window.__dbg.WPN.ads=0;")
        info = await pg.evaluate("(() => { const r = window.__dbg.renderer.info.render; return [r.calls, r.triangles]; })()")
        print('draw calls / triangles (last pass):', info)
        for l in logs[:40]: print(l[:500])
        await b.close()
asyncio.run(main())
