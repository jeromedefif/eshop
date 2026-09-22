import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
describe('Excel dependency regression', () => {
  it('preserves Czech text and treats customer-entered formula text as text', () => {
    const sheet = XLSX.utils.aoa_to_sheet([['Zákazník', 'Poznámka', 'Litry'], ['Žluťoučký s.r.o.', '=HYPERLINK("https://example.invalid")', 25]]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Objednávky');
    const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const restored = XLSX.read(output, { type: 'buffer' }).Sheets['Objednávky'];
    expect(restored.A2.v).toBe('Žluťoučký s.r.o.');
    expect(restored.B2.t).toBe('s'); expect(restored.B2.f).toBeUndefined();
    expect(restored.C2.v).toBe(25);
  });
});
