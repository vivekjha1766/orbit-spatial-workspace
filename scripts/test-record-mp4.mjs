import { spawn } from 'node:child_process';
import fs from 'node:fs';

export default async function run({ page, cdp }) {
  console.log('Testing CDP frame piping with stderr logging...');
  const testMp4Path = 'test_record.mp4';
  if (fs.existsSync(testMp4Path)) fs.unlinkSync(testMp4Path);

  const ffmpeg = spawn('ffmpeg', [
    '-y',
    '-f', 'image2pipe',
    '-vcodec', 'mjpeg',
    '-r', '30',
    '-i', '-',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'fast',
    testMp4Path
  ]);

  let stderrLog = '';
  ffmpeg.stderr.on('data', (d) => {
    stderrLog += d.toString();
  });

  ffmpeg.stdin.on('error', (err) => {
    console.log('ffmpeg stdin error:', err.message);
  });

  let frameCount = 0;
  const onFrame = async (params) => {
    frameCount++;
    const buffer = Buffer.from(params.data, 'base64');
    if (ffmpeg.stdin.writable) {
      ffmpeg.stdin.write(buffer);
    }
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

  console.log('Recording for 3 seconds...');
  await page.waitForTimeout(3000);

  await cdp.send('Page.stopScreencast');
  cdp.off('Page.screencastFrame', onFrame);

  if (ffmpeg.stdin.writable) {
    ffmpeg.stdin.end();
  }

  await new Promise((resolve) => ffmpeg.on('close', resolve));
  console.log(`FFmpeg closed. Total frames fed: ${frameCount}`);
  console.log('FFmpeg stderr tail:\n', stderrLog.slice(-500));

  const exists = fs.existsSync(testMp4Path);
  const size = exists ? fs.statSync(testMp4Path).size : 0;
  console.log(`Result: ${testMp4Path} exists=${exists}, size=${size} bytes`);

  return { ok: exists, size, frameCount };
}
