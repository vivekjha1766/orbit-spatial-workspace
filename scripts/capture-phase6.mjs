import path from 'node:path';

export default async function run({ page, frame, workspaceRoot }) {
  const artifactDir = 'C:\\Users\\jhavi\\.gemini\\antigravity\\brain\\7dd45aeb-9b49-42b5-83fb-16746ab37374';

  console.log('Finding frame with __ORBIT__...');
  let appTarget = null;
  for (const f of page.frames()) {
    try {
      const hasOrbit = await f.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
      if (hasOrbit) {
        appTarget = f;
        console.log('Found __ORBIT__ in frame:', f.url());
        break;
      }
    } catch {}
  }

  if (!appTarget && frame) {
    try {
      const hasOrbit = await frame.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
      if (hasOrbit) appTarget = frame;
    } catch {}
  }

  if (!appTarget) {
    console.log('Checking page directly...');
    const hasOrbit = await page.evaluate(() => typeof window.__ORBIT__ !== 'undefined');
    if (hasOrbit) appTarget = page;
  }

  if (!appTarget) {
    throw new Error('Could not find frame with window.__ORBIT__');
  }

  // 1. Initial Workspace
  await appTarget.evaluate(() => {
    window.__ORBIT__.selectNode('integration');
    window.__ORBIT_ONBOARDING__.start();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'orbit-phase6-workspace.png') });
  console.log('1. Captured orbit-phase6-workspace.png');

  // 2. Selected Workflow Node (Inspect integration)
  await appTarget.evaluate(() => {
    window.__ORBIT__.selectNode('integration');
    window.__ORBIT_ONBOARDING__.onNodeSelected('integration');
    window.__ORBIT_ONBOARDING__.onTaskDetailsInspected();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'orbit-phase6-selected-node.png') });
  console.log('2. Captured orbit-phase6-selected-node.png');

  // 3. Active Dependency Creation (Drafting edge from requirements)
  await appTarget.evaluate(() => {
    window.__ORBIT__.startDraftConnection('requirements');
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'orbit-phase6-dependency-creation.png') });
  console.log('3. Captured orbit-phase6-dependency-creation.png');

  // Cancel draft connection
  await appTarget.evaluate(() => {
    window.__ORBIT__.cancelDraftConnection('Screenshot capture completed');
  });

  // 4. Navigator Recommendation (Highlighting 3D affected tasks)
  await appTarget.evaluate(() => {
    window.__ORBIT__.selectNode('integration');
    window.__ORBIT__.toggleActiveRecommendationHighlight();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'orbit-phase6-navigator.png') });
  console.log('4. Captured orbit-phase6-navigator.png');

  // 5. Scenario Comparison (Simulating -1d compression on integration)
  await appTarget.evaluate(() => {
    window.__ORBIT__.clearSpatialHighlights();
    window.__ORBIT__.adjustProposedDuration(-1);
    window.__ORBIT__.simulateCurrentScenario();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'orbit-phase6-scenario.png') });
  console.log('5. Captured orbit-phase6-scenario.png');

  // Discard hypothetical scenario
  await appTarget.evaluate(() => {
    window.__ORBIT__.discardCurrentScenario();
  });

  // 6. Onboarding Welcome Panel
  await appTarget.evaluate(() => {
    window.__ORBIT_ONBOARDING__.restart();
    window.__ORBIT__.refreshOnboardingPanel();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'orbit-phase6-onboarding-welcome.png') });
  console.log('6. Captured orbit-phase6-onboarding-welcome.png');

  // 7. Completed Workflow / Reset State
  await appTarget.evaluate(() => {
    window.__ORBIT__.resetSampleWorkspace();
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(artifactDir, 'orbit-phase6-reset-workspace.png') });
  console.log('7. Captured orbit-phase6-reset-workspace.png');

  console.log('All 7 Phase 6 visual verification screenshots captured successfully.');
}
