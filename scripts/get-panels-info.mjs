export default async function run({ page }) {
  const f1 = page.frames()[1];
  const panelsInfo = await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    const res = {};
    const panels = [
      ['headerPanel', orbit.headerPanel],
      ['taskInspectorPanel', orbit.taskInspectorPanel],
      ['navigatorPanel', orbit.navigatorPanel],
      ['scenarioPanel', orbit.scenarioPanel],
      ['onboardingPanel', orbit.onboardingPanel],
      ['workspaceSummaryPanel', orbit.workspaceSummaryPanel]
    ];
    for (const [name, p] of panels) {
      if (!p) {
        res[name] = 'null';
        continue;
      }
      const ent = p.entity || p;
      const obj = ent.object3D;
      res[name] = {
        pos: obj ? obj.position.toArray() : null,
        rot: obj ? [obj.rotation.x, obj.rotation.y, obj.rotation.z] : null,
        visible: obj ? obj.visible : null
      };
    }
    return res;
  });
  console.log('Panels info:', JSON.stringify(panelsInfo, null, 2));
}

