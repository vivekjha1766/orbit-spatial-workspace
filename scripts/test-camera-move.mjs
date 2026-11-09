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

  const res = await appTarget.evaluate(async () => {
    const orbit = window.__ORBIT__;
    const world = orbit.world;
    const cam = world.camera || world.defaultCamera;
    const initialPos = cam.position.toArray();
    cam.position.x += 0.5;
    
    // Wait 500ms
    await new Promise(r => setTimeout(r, 500));
    const afterPos = cam.position.toArray();
    
    // Check if camera is inside a camera rig / parent
    const parentName = cam.parent?.name || cam.parent?.constructor?.name;
    const sceneChildren = world.scene ? world.scene.children.map(c => c.name || c.constructor.name) : [];
    
    return {
      initialPos,
      afterPos,
      parentName,
      sceneChildren
    };
  });
  
  console.log('Result:', JSON.stringify(res, null, 2));
  return res;
}

