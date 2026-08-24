const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Navigate to the local server
  await page.goto('http://localhost:3000');

  // Wait for the app to load
  await page.waitForSelector('.tab-btn');

  // Click on "Carrier Download (AL3 / RLS)" tab
  await page.click('text="📥 Carrier Download (AL3 / RLS)"');

  // Ensure we are on the tab containing the parse and ingest buttons
  await page.waitForSelector('#btn-parse-al3');

  // Trigger Parse AL3 Request
  await page.click('#btn-parse-al3');

  // The state should be '⏳ Parsing...' during load
  const parseBtnText = await page.innerText('#btn-parse-al3');
  console.log('Parse Button Text (loading):', parseBtnText);
  // Due to execution speed, we might capture it after it finishes parsing (if it's too fast),
  // but let's try to verify the loading state is applied.

  await browser.close();
})();
