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
  });

  it('should contain actionable Call-To-Action buttons in empty states', () => {
    expect(htmlContent).toMatch(/<button[^>]*class=["']btn/);
  });
});
