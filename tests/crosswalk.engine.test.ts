import { CrosswalkEngine } from '../src/transformers/crosswalk.engine.js';
import { IngestionPayload } from '../src/types/legacy.js';

describe('CrosswalkEngine', () => {
  it('should handle unknown system source and generate a critical exception', () => {
    const engine = new CrosswalkEngine([]);

    const payload: IngestionPayload = {
      systemSource: 'FORMAT_E' as any,
      data: [{ someField: 'someValue' }]
    };

    const result = engine.processIngestion(payload);

    expect(result.exceptions.length).toBeGreaterThan(0);
    const exception = result.exceptions.find(e => e.reason.includes('Unsupported or unidentifiable legacy format type'));
    expect(exception).toBeDefined();
    expect(exception?.recordIdentifier).toBe('UNKNOWN_RECORD');
    expect(exception?.systemSource).toBe('FORMAT_E');
    expect(exception?.field).toBe('systemSource');
    expect(exception?.severity).toBe('CRITICAL');
  });
});
