import fs from 'node:fs';

export default async function run({ page }) {
  const f1 = page.frames()[1];
  const dataUrl = await f1.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  });

  if (dataUrl) {
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('../temp_inspect/canvas_direct.png', Buffer.from(base64Data, 'base64'));
    console.log('Saved ../temp_inspect/canvas_direct.png');
  } else {
    console.log('No canvas found!');
  }
}

