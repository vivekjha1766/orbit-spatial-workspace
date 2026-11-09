export default async function run({ page }) {
  const f0 = page.frames()[0];
  const rect = await f0.evaluate(() => {
    const iframe = document.getElementById('workspace-runtime-frame') || document.querySelector('iframe');
    if (!iframe) return null;
    const r = iframe.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      top: r.top,
      left: r.left,
      bottom: r.bottom,
      right: r.right
    };
  });
  console.log('Iframe bounding rect:', JSON.stringify(rect, null, 2));
  return rect;
}

