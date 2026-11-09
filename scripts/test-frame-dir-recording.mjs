import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

export default async function run({ page, cdp, workspaceRoot }) {
  console.log('Testing frame-dir recording with 1920x1080 scaling...');
  const testDir = path.join(workspaceRoot, '.test_frames');
  if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  fs.mkdirSync(testDir, { recursive: true });

  let frameIndex = 0;
  const onFrame = async (params) => {
    const filename = path.join(testDir, `frame_${String(frameIndex++).padStart(6, '0')}.jpg`);
    fs.writeFileSync(filename, Buffer.from(params.data, 'base64'));
    try {
      await cdp.send('Page.screencastFrameAck', { sessionId: params.sessionId });
    } catch {}
  };

  cdp.on('Page.screencastFrame', onFrame);

  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 90,
    maxWidth: 1920,
    maxHeight: 1080,
    everyNthFrame: 1
  });

  console.log('Recording for 2 seconds...');
  await page.waitForTimeout(2000);

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  console.log(`Saved ${frameIndex} frames to ${testDir}`);

  const outMp4 = path.join(workspaceRoot, 'test_output_2s.mp4');
  if (fs.existsSync(outMp4)) fs.unlinkSync(outMp4);

  const ffmpegCmd = `ffmpeg -y -framerate 30 -i "${testDir}\\frame_%06d.jpg" -vf "scale=1920:1080" -c:v libx264 -pix_fmt yuv420p "${outMp4}"`;
  console.log('Running ffmpeg encoding with 1920x1080 scaling...');
  execSync(ffmpegCmd);

  const stat = fs.statSync(outMp4);
  console.log(`Encoded MP4 size: ${stat.size} bytes`);
  return { frameIndex, mp4Size: stat.size };
}
