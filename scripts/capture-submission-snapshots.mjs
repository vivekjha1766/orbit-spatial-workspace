import path from 'node:path';
import fs from 'node:fs';

export default async function run({ page, workspaceRoot }) {
  const rootSubmissionDir = 'c:\\Users\\jhavi\\Desktop\\ai_ml_dev\\projects\\Meta-VR-Competition\\submission\\snapshots';
  const entrySubmissionDir = path.join(workspaceRoot, 'submission', 'snapshots');

  console.log('Resolving frame with window.__ORBIT__...');
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
  if (!appTarget) {
    throw new Error('Could not find frame with window.__ORBIT__');
  }

  console.log('Target frame found. Verifying Part B: Demo Environment State...');

  // Reset workspace first to ensure clean state
  const envCheck = await appTarget.evaluate(() => {
    const orbit = window.__ORBIT__;
    orbit.resetSampleWorkspace();

    const nodeCount = orbit.nodeEntities.size;
    const edgeCount = orbit.edgeBindings.length;
    const portCount = orbit.portEntities.length;
    const projectDuration = orbit.schedule.projectDuration;
    const criticalPath = orbit.schedule.criticalPath;
    const hasHeader = Boolean(orbit.headerPanel);
    const hasDetails = Boolean(orbit.detailsPanel);
    const hasNavigator = Boolean(orbit.navigatorPanel);
    const hasOnboarding = Boolean(orbit.onboardingPanel);

    // Verify recommendations available
    const recs = orbit.navigator.analyzeWorkflow(orbit.graph);
    const hasRecommendations = recs.length > 0;

    return {
      nodeCount,
      edgeCount,
      portCount,
      projectDuration,
      criticalPath,
      hasHeader,
      hasDetails,
      hasNavigator,
      hasOnboarding,
      hasRecommendations,
      recommendationCount: recs.length,
      topRecommendation: recs[0]?.title,
    };
  });

  console.log('Environment Verification Results:');
  console.log(`  Nodes: ${envCheck.nodeCount} (expected 9)`);
  console.log(`  Edges: ${envCheck.edgeCount} (expected 12)`);
  console.log(`  Ports: ${envCheck.portCount} (expected 18)`);
  console.log(`  Project Duration: ${envCheck.projectDuration} days (expected 27)`);
  console.log(`  Critical Path: ${envCheck.criticalPath.join(' -> ')}`);
  console.log(`  Panels: Header=${envCheck.hasHeader}, Inspector=${envCheck.hasDetails}, Navigator=${envCheck.hasNavigator}, Onboarding=${envCheck.hasOnboarding}`);
  console.log(`  Recommendations: ${envCheck.recommendationCount} available ("${envCheck.topRecommendation}")`);

  const saveSnapshot = async (filename) => {
    const rootPath = path.join(rootSubmissionDir, filename);
    const entryPath = path.join(entrySubmissionDir, filename);
    await page.screenshot({ path: rootPath });
    fs.copyFileSync(rootPath, entryPath);
    console.log(`  Saved: ${filename}`);
  };

  console.log('\n--- Capturing 7 Submission Snapshots ---');

  // 1. ORBIT Workspace Overview
  await appTarget.evaluate(() => {
    window.__ORBIT__.resetSampleWorkspace();
    window.__ORBIT__.selectNode('integration');
    window.__ORBIT_ONBOARDING__.start();
  });
  await page.waitForTimeout(600);
  await saveSnapshot('01-orbit-workspace-overview.png');

  // 2. Full Dependency Graph & Critical Path
  await appTarget.evaluate(() => {
    window.__ORBIT__.deselect();
    window.__ORBIT__.clearSpatialHighlights();
  });
  await page.waitForTimeout(600);
  await saveSnapshot('02-orbit-full-dependency-graph-critical-path.png');

  // 3. Selected Node with Task Inspector
  await appTarget.evaluate(() => {
    window.__ORBIT__.selectNode('integration');
    window.__ORBIT_ONBOARDING__.onNodeSelected('integration');
    window.__ORBIT_ONBOARDING__.onTaskDetailsInspected();
  });
  await page.waitForTimeout(600);
  await saveSnapshot('03-orbit-task-inspector-details.png');

  // 4. Spatial Dependency Creation
  await appTarget.evaluate(() => {
    window.__ORBIT__.startDraftConnection('requirements');
  });
  await page.waitForTimeout(600);
  await saveSnapshot('04-orbit-spatial-dependency-creation.png');

  // Cancel draft
  await appTarget.evaluate(() => {
    window.__ORBIT__.cancelDraftConnection('Snapshot complete');
  });

  // 5. Navigator Recommendation & 3D Highlights
  await appTarget.evaluate(() => {
    window.__ORBIT__.selectNode('integration');
    window.__ORBIT__.toggleActiveRecommendationHighlight();
  });
  await page.waitForTimeout(600);
  await saveSnapshot('05-orbit-navigator-recommendations.png');

  // 6. What-If Simulation Comparison
  await appTarget.evaluate(() => {
    window.__ORBIT__.clearSpatialHighlights();
    window.__ORBIT__.adjustProposedDuration(-1);
  });
  await page.waitForTimeout(600);
  await saveSnapshot('06-orbit-whatif-scenario-simulation.png');

  // Discard scenario
  await appTarget.evaluate(() => {
    window.__ORBIT__.discardCurrentScenario();
  });

  // 7. Onboarding Guided Experience
  await appTarget.evaluate(() => {
    window.__ORBIT__.resetSampleWorkspace();
    window.__ORBIT_ONBOARDING__.start();
  });
  await page.waitForTimeout(600);
  await saveSnapshot('07-orbit-onboarding-guided-experience.png');

  console.log('\nAll 7 submission snapshots captured and synced successfully.');
  return {
    success: true,
    envCheck,
  };
}

