import fs from 'fs';
import path from 'path';

describe('UI Empty States & DOM Structure Guardrail', () => {
  const targetPath = path.resolve(process.cwd(), 'public/index.html');
  let htmlContent: string;

  beforeAll(() => {
    expect(fs.existsSync(targetPath)).toBe(true);
    htmlContent = fs.readFileSync(targetPath, 'utf-8');
  });

  it('should not contain any lingering Git merge conflict markers', () => {
    expect(htmlContent).not.toMatch(/<{7}\s/);
    expect(htmlContent).not.toMatch(/={7}/);
    expect(htmlContent).not.toMatch(/>{7}\s/);
  });

  const requiredEmptyStates = [
    "No General Ledger entries found",
    "No agency bill invoices found",
    "No certificates found",
    "No certificate holders found",
    "No customers found",
    "No download batches found",
    "No crosswalk rules defined"
];

  test.each(requiredEmptyStates)('should contain empty state: %s', (emptyStateText) => {
    expect(htmlContent).toContain(emptyStateText);

    // 🎨 Palette: Verify that the empty state title element NO LONGER includes aria-live="polite" (migrated to global announcer)
    const regex = new RegExp(`aria-live="polite">\\s*${emptyStateText}`);
    expect(htmlContent).not.toMatch(regex);
  });

  it('should contain actionable Call-To-Action buttons in empty states', () => {
    expect(htmlContent).toMatch(/<button[^>]*class=["']btn/);
  });

  it('should contain a functional skip-to-content link for keyboard accessibility', () => {
    // 🎨 Palette: Verify skip link exists and targets main content with tabindex="-1"
    expect(htmlContent).toMatch(/<a[^>]*href="#main-content"[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*>Skip to main content<\/a>/);
    expect(htmlContent).toMatch(/<main[^>]*id="main-content"[^>]*tabindex="-1"/);
  });
});

