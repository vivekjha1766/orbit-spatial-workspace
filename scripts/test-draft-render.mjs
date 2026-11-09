export default async function run({ page }) {
  const f1 = page.frames()[1];

  // Reset to baseline first
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();
    orbit.deselect();
    const cam = orbit.world.camera || orbit.world.defaultCamera;
    cam.position.set(-0.25, 1.45, 0.7);
    cam.lookAt(0, 1.4, -1.0);
  });

  await page.waitForTimeout(500);

  // Step 1: Start draft from architecture
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.startDraftConnection('architecture');
  });
  await page.waitForTimeout(300);
  const shot1 = await page.screenshot({ path: '../temp_inspect/draft_start.png' });

  // Step 2: Show invalid cycle to requirements (coral red)
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.draftCandidateDestNodeId = 'requirements';
    orbit.draftStatus = 'invalid';
    const reqEnt = orbit.nodeEntities.get('requirements');
    if (reqEnt?.object3D) {
      orbit.setPortFeedback?.(reqEnt.object3D, 'input', 'invalid');
    }
  });
  await page.waitForTimeout(500);
  const shot2 = await page.screenshot({ path: '../temp_inspect/draft_invalid_red.png' });

  // Step 3: Show valid connection to testing (emerald green)
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.draftCandidateDestNodeId = 'testing';
    orbit.draftStatus = 'valid';
  });
  await page.waitForTimeout(500);
  const shot3 = await page.screenshot({ path: '../temp_inspect/draft_valid_green.png' });

  // Step 4: Complete connection
  await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.completeDraftConnection('testing');
  });
  await page.waitForTimeout(500);
  const shot4 = await page.screenshot({ path: '../temp_inspect/draft_completed.png' });

  console.log('Saved draft_start, draft_invalid_red, draft_valid_green, draft_completed');
}

