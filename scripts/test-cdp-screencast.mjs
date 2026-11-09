import fs from 'node:fs';

export default async function run({ page, cdp }) {
  console.log('Testing CDP Screencast...');
  const frames = [];
  
  cdp.on('Page.screencastFrame', async (params) => {
    frames.push(params.data.length);
    // acknowledge frame
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
    } catch {}
  });

  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 85,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1
  });

  console.log('Screencast started, waiting 2 seconds...');
  await page.waitForTimeout(2000);

  await cdp.send('Page.stopScreencast');
  console.log(`Received ${frames.length} frames via CDP screencast!`);
  return { frameCount: frames.length };
}

