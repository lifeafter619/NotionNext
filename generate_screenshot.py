
import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1400, 'height': 900})
        await context.route("**/*.{png,jpg,jpeg,svg,gif,webp}", lambda route: route.abort())
        page = await context.new_page()
        page.set_default_timeout(60000)

        url = 'http://localhost:3000/article/smart-questions'
        print(f"Navigating to {url}")
        try:
            await page.goto(url, timeout=60000)
            await page.wait_for_load_state('domcontentloaded')
            await page.wait_for_timeout(3000)
        except Exception as e:
            print(f"Error loading page: {e}")
            await browser.close()
            return

        # Scroll to show float button
        await page.evaluate('window.scrollTo(0, 3000)')
        await page.wait_for_timeout(2000)

        # Check float button
        float_btn = page.locator('#float-toc-button')
        if not await float_btn.is_visible():
             await page.evaluate('''() => {
                const side = document.getElementById('sideRight');
                if(side) side.style.display = 'none';
                window.dispatchEvent(new Event('scroll'));
            }''')
             await page.wait_for_timeout(1000)

        await page.screenshot(path='verification_desktop.png')
        print("Screenshot saved to verification_desktop.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(run())
