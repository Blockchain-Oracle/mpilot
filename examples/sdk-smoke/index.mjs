import { ConciergeError, defaultModel } from '@mpilot/sdk';

console.log('✓ @mpilot/sdk imports OK');
console.log('  defaultModel typeof:', typeof defaultModel);
console.log('  ConciergeError typeof:', typeof ConciergeError);
try {
  throw new ConciergeError('InternalError', 'test');
} catch (e) {
  console.log('  ConciergeError constructible:', e.type, '|', e.message);
}
