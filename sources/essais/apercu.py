import asyncio, os
from playwright.async_api import async_playwright
BASE = os.path.dirname(os.path.abspath(__file__)) + '/..'
LIB = BASE + '/lib/package/'
F = BASE + '/fonts/'
html = open(BASE + '/site/index.html', encoding='utf-8').read()
html = html.replace("// premier rendu puis ouverture de la porte", "window.__dbg = { M, setAttract: (t) => { attractT = t; } };\n// premier rendu puis ouverture de la porte")
html = html.replace("</head>", "<style>.commandes,.pitch,.note{display:none!important}.ecran-contenu{grid-template-columns:1fr}.ecran{padding-left:56px;padding-bottom:48px}</style></head>")
CSS = """
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:600;src:url(http://jeu.test/f/cormorant-garamond-latin-600-italic.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:400;src:url(http://jeu.test/f/cormorant-garamond-latin-400-italic.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;src:url(http://jeu.test/f/cormorant-garamond-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'VT323';font-style:normal;font-weight:400;src:url(http://jeu.test/f/vt323-latin-400-normal.woff2) format('woff2')}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle'])
        pg = await b.new_page(viewport={'width':1200,'height':630})
        logs = []
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        async def route(r):
            u = r.request.url
            if u.startswith('https://cdn.jsdelivr.net/npm/three@0.147.0/'):
                await r.fulfill(path=LIB + u.split('three@0.147.0/')[1], content_type='application/javascript')
            elif u.startswith('https://fonts.googleapis.com/css2'):
                await r.fulfill(body=CSS, content_type='text/css')
            elif u.startswith('http://jeu.test/f/'):
                name = u.split('/f/')[1]
                d = 'fontsource-vt323-5.0.12' if 'vt323' in name else 'fontsource-cormorant-garamond-5.0.13'
                await r.fulfill(path=F + d + '/package/files/' + name, content_type='font/woff2')
            elif u.startswith('http://jeu.test/'):
                await r.fulfill(body=html, content_type='text/html')
            else: await r.abort()
        await pg.route('**/*', route)
        await pg.goto('http://jeu.test/')
        await pg.wait_for_timeout(3000)
        await pg.evaluate("(() => { const d = window.__dbg; d.setAttract(83.5); d.M.pos.set(1.2, 0, 21); d.M.state='hunt'; d.M.form=1; d.M.yaw = 0.0; })()")
        await pg.wait_for_timeout(6000)
        await pg.screenshot(path=BASE + '/site/apercu.jpg', type='jpeg', quality=88)
        print(logs)
        await b.close()
asyncio.run(main())
