import { ConciergeError, defaultModel } from '@concierge-mantle/sdk';

console.log('✓ @concierge-mantle/sdk imports OK');
console.log('  defaultModel typeof:', typeof defaultModel);
console.log('  ConciergeError typeof:', typeof ConciergeError);
try {
  throw new ConciergeError('InternalError', 'test');
} catch (e) {
  console.log('  ConciergeError constructible:', e.type, '|', e.message);
}
