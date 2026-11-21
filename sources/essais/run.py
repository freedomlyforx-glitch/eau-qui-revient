import asyncio, sys, os, time
from playwright.async_api import async_playwright
BASE = os.path.dirname(os.path.abspath(__file__)) + '/..'
LIB = BASE + '/lib/package/'
HTML = open(BASE + '/eau-qui-revient.html', encoding='utf-8').read()
PAGE = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}</style></head><body>' + HTML + '</body></html>'
async def main(mode):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle'])
        pg = await b.new_page(viewport={'width':1280,'height':720})
        logs = []
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        async def route(r):
            u = r.request.url
            if u.startswith('https://cdn.jsdelivr.net/npm/three@0.147.0/'):
                path = LIB + u.split('three@0.147.0/')[1]
                await r.fulfill(path=path, content_type='application/javascript')
            elif u.startswith('http://jeu.test/'):
                await r.fulfill(body=PAGE, content_type='text/html')
            else:
                await r.abort()
        await pg.route('**/*', route)
        await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(6000)
        await pg.screenshot(path=BASE + '/tests/menu.png')
        if mode == 'play':
            await pg.click('#entrer')
            await pg.wait_for_timeout(1500)
            await pg.screenshot(path=BASE + '/tests/play1.png')
            await pg.mouse.move(640, 360)
            await pg.mouse.down()
            await pg.wait_for_timeout(700)
            await pg.screenshot(path=BASE + '/tests/fire.png')
            await pg.mouse.up()
            await pg.keyboard.down('KeyW')
            await pg.wait_for_timeout(2500)
            await pg.keyboard.up('KeyW')
            await pg.mouse.down(button='right')
            await pg.wait_for_timeout(600)
            await pg.mouse.down()
            await pg.wait_for_timeout(1800)
            await pg.screenshot(path=BASE + '/tests/ads.png')
            await pg.mouse.up(); await pg.mouse.up(button='right')
            await pg.wait_for_timeout(500)
        fps = await pg.evaluate('''() => new Promise(res => { let n=0; const t0=performance.now(); function f(){ n++; if (performance.now()-t0<2000) requestAnimationFrame(f); else res(n/2); } requestAnimationFrame(f); })''')
        print('fps(swiftshader):', fps)
        for l in logs[:60]: print(l[:600])
        await b.close()
asyncio.run(main(sys.argv[1] if len(sys.argv)>1 else 'menu'))
