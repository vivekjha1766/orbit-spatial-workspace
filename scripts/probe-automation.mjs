export default async function run({ browser, context, page, frame, cdp, workspaceRoot }) {
  console.log('--- Automation Probe ---');
  console.log('browser exists:', Boolean(browser));
  console.log('context exists:', Boolean(context));
  console.log('page exists:', Boolean(page));
  console.log('cdp exists:', Boolean(cdp));
  console.log('page viewport:', page.viewportSize());
  
  // Check if we can capture screenshots or screencast
  const title = await page.title();
  console.log('page title:', title);

  return { ok: true };
}

