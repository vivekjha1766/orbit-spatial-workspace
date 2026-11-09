export default async function run({ page }) {
  let appTarget = null;
  for (const f of page.frames()) {
    try {
      if (await f.evaluate(() => typeof window.__ORBIT__ !== 'undefined')) {
        appTarget = f;
        break;
      }
    } catch {}
  }
  if (!appTarget) appTarget = page;

  const result = await appTarget.evaluate(() => {
    const orbit = window.__ORBIT__;
    const panel = orbit.onboardingPanel;
    const info = {
      exists: Boolean(panel),
      hasVisible: 'visible' in (panel || {}),
      hasPosition: 'position' in (panel || {}),
      object3D: panel?.object3D ? {
        visible: panel.object3D.visible,
        pos: panel.object3D.position
      } : null,
      panelKeys: panel ? Object.keys(panel) : []
    };

    // Try hiding or moving panel
    if (panel) {
      if ('visible' in panel) panel.visible = false;
      if (panel.object3D) panel.object3D.visible = false;
      if (panel.position) panel.position.y = -10;
    }

    return info;
  });

  console.log('Onboarding Panel Inspection:', JSON.stringify(result, null, 2));
  return result;
}

