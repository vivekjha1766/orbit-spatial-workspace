export default async function run({ page }) {
  let appTarget = null;
  for (const f of page.frames()) {
    try {
      const hasOrbit = await f.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
      if (hasOrbit) {
        appTarget = f;
        break;
      }
    } catch {}
  }
  if (!appTarget) {
    const hasOrbit = await page.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
    if (hasOrbit) appTarget = page;
  }

  const camInfo = await appTarget.evaluate(() => {
    const orbit = window.__ORBIT__;
    const world = orbit.world;
    const cam = world.camera || world.defaultCamera;
    return {
      camPos: cam ? cam.position.toArray() : null,
      camRot: cam ? [cam.rotation.x, cam.rotation.y, cam.rotation.z] : null,
      camType: cam ? cam.constructor.name : null,
    };
  });
  console.log('Camera details:', JSON.stringify(camInfo, null, 2));
  return camInfo;
}
