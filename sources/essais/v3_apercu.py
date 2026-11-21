import asyncio, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from v2 import *
async def ev(pg, js):
    return await pg.evaluate("(() => { const d = window.__dbg; " + js + " })()")
async def main():
    async with async_playwright() as p:
        b, ctx = await setup(p, 1200, 630)
        logs = []
        pg = await page(ctx, logs)
        await pg.add_style_tag(content=".appareils,.note,.encart,.sur-titre[style],#prep{display:none!important}.ecran-contenu{grid-template-columns:1fr}.ecran{padding-left:56px;padding-bottom:40px;background:linear-gradient(90deg,rgba(28,20,48,.55) 0%,rgba(28,20,48,0) 55%),linear-gradient(180deg,rgba(28,20,48,0) 50%,rgba(28,20,48,.6) 100%)}.pitch{max-width:24em}")
        await pg.wait_for_timeout(5000)
        await ev(pg, "d.setState('apercu'); d.setTimeOfDay(322); d.step(30, 0.03); d.camera.position.set(-22, d.TH(-22, -30) + 1.5, -30); d.camera.rotation.set(0.05, -0.41, 0);")
        await pg.wait_for_timeout(9000)
        await pg.screenshot(path=BASE + '/v3/apercu.jpg', type='jpeg', quality=88)
        print(logs[:5])
        await b.close()
asyncio.run(main())
