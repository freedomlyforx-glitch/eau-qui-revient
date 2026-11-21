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
        await ev(pg, "d.setState('apercu'); d.camera.position.set(4.2, 1.55, 33); d.camera.rotation.set(0.07, 0.42, 0); d.M.pos.set(-3, 0, 6); d.M.state='hunt'; d.M.form=1; d.M.cooldown=99;")
        # balles smiley et moutons au premier plan
        await ev(pg, "let ci=-1, bd=1e9; d.CROWNS.forEach(c => { const dd=(c.x-9.4)**2+(c.z-24)**2; if (dd<bd){bd=dd; ci=c.i;} }); for (let k=0;k<16;k++) d.shakePalm(ci, 22, k*11); const s=d.SHEEP; [[ -2, 24],[1.5,21],[-5,19]].forEach(([x,z],i)=>{ const q=s[6+i]; q.x=q.ix=x; q.z=q.iz=z; q.yaw=0.6*i+2.6; q.st='regarde'; }); d.step(120, 1/30);")
        await ev(pg, "d.camera.position.set(4.2, 1.55, 33); d.camera.rotation.set(0.07, 0.42, 0);")
        await pg.wait_for_timeout(9000)
        await pg.screenshot(path=BASE + '/v2/site/apercu.jpg', type='jpeg', quality=88)
        print(logs[:5])
        await b.close()
asyncio.run(main())
