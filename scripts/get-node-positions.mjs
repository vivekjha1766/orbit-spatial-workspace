export default async function run({ page }) {
  const f1 = page.frames()[1];
  const nodePositions = await f1.evaluate(() => {
    const orbit = window.__ORBIT__;
    const res = {};
    for (const [id, ent] of orbit.nodeEntities.entries()) {
      res[id] = ent.object3D.position.toArray();
    }
    return res;
  });
  console.log('Node positions:', JSON.stringify(nodePositions, null, 2));
}

