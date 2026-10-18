// These PNGs support manual review; they are not visual regression assertions.
// Failure screenshots and traces are configured separately in Playwright.
export async function captureEvidence(page, options) {
  if (process.env.SANTA_E2E_SCREENSHOTS === '1') await page.screenshot(options);
}
