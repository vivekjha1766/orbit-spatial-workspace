export default async function run({ page }) {
  console.log('Page URL:', page.url());
  const frames = page.frames();
  console.log('Total frames:', frames.length);
  const frameInfos = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const url = f.url();
    let hasOrbit = false;
    let title = '';
    try {
      hasOrbit = await f.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
      title = await f.title();
    } catch (e) {
      // ignore
    }
    frameInfos.push({ index: i, url, hasOrbit, title });
    console.log(`Frame ${i}: url=${url}, hasOrbit=${hasOrbit}, title=${title}`);
  }

  // Take a screenshot of the page
  await page.screenshot({ path: '../temp_inspect/puppeteer_page.png' });
  console.log('Screenshot saved to ../temp_inspect/puppeteer_page.png');

  return { frameInfos };
}
