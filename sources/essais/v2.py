import asyncio, os, sys, json
from playwright.async_api import async_playwright
BASE = os.path.dirname(os.path.abspath(__file__)) + '/..'
LIB = BASE + '/lib/package/'
SITE = BASE + '/' + __import__('os').environ.get('SITE', 'v2') + '/site/'
F = BASE + '/fonts/'
QUAL = os.environ.get('QUAL', '')
CSS = """
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:600;src:url(http://jeu.test/f/cormorant-garamond-latin-600-italic.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:400;src:url(http://jeu.test/f/cormorant-garamond-latin-400-italic.woff2) format('woff2')}
@font-face{font-family:'Cormorant Garamond';font-style:normal;font-weight:500;src:url(http://jeu.test/f/cormorant-garamond-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'VT323';font-style:normal;font-weight:400;src:url(http://jeu.test/f/vt323-latin-400-normal.woff2) format('woff2')}
"""
async def setup(p, w=1280, h=720, mobile=False):
    b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--use-gl=angle','--autoplay-policy=no-user-gesture-required'])
    ctx = await b.new_context(viewport={'width':w,'height':h}, has_touch=mobile, is_mobile=mobile)
    return b, ctx
async def route(r):
    u = r.request.url
    if u.startswith('https://cdn.jsdelivr.net/npm/three@0.147.0/'):
        await r.fulfill(path=LIB + u.split('three@0.147.0/')[1].split('?')[0], content_type='application/javascript')
    elif u.startswith('https://fonts.googleapis.com/css2'):
        await r.fulfill(body=CSS, content_type='text/css')
    elif u.startswith('http://jeu.test/f/'):
        name = u.split('/f/')[1]
        d = 'fontsource-vt323-5.0.12' if 'vt323' in name else 'fontsource-cormorant-garamond-5.0.13'
        await r.fulfill(path=F + d + '/package/files/' + name, content_type='font/woff2')
    elif u.startswith('http://jeu.test/') or u.startswith('https://jeu.test/'):
        path = u.split('jeu.test/')[1].split('?')[0].split('#')[0] or 'index.html'
        fp = SITE + path
        if os.path.exists(fp):
            await r.fulfill(path=fp, content_type='text/html' if fp.endswith('.html') else 'audio/mpeg' if fp.endswith('.mp3') else 'image/jpeg')
        else:
            await r.fulfill(status=404, body='')
    else:
        await r.abort()
async def page(ctx, logs, url='http://jeu.test/'):
    pg = await ctx.new_page()
    pg.set_default_timeout(120000)
    if QUAL: await pg.add_init_script("try{localStorage.setItem('eqr-qualite','" + QUAL + "')}catch(e){}")
    pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e} :: ' + ' | '.join(str(getattr(e, 'stack', '') or '').split(chr(10))[1:4])))
    await pg.route('**/*', route)
    await pg.goto(url)
    return pg
