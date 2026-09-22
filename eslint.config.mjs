import next from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
export default [
  { ignores: ['.next/**', 'node_modules/**', 'supabase/functions/**'] },
  ...next,
  ...nextTypescript,
  { rules: {
    // Compiler adoption is separate from this security release. Preserve the
    // existing hooks checks while keeping compiler-only diagnostics out of CI.
    'react-hooks/set-state-in-effect': 'off',
    'react-hooks/refs': 'off',
    'react-hooks/purity': 'off',
    'react-hooks/immutability': 'off',
    'react-hooks/preserve-manual-memoization': 'off',
    'react-hooks/incompatible-library': 'off',
  } },
  { files: ['app/lib/prisma.ts'], rules: { 'no-var': 'off' } },
];
