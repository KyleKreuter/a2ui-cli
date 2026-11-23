import { afterEach } from 'vitest';
import { cleanupTty } from './ink.js';

afterEach(() => {
  cleanupTty();
});
