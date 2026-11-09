export default async function run({ page }) {
  console.log('Testing browser run...');
  const result = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      hasPerformance: typeof performance !== 'undefined',
      hasMemory: typeof performance.memory !== 'undefined',
    };
  });
  console.log('Browser evaluation result:', JSON.stringify(result));
  return result;
}

