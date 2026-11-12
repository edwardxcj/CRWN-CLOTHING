// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { webcrypto } from 'crypto';

// Create React App's JSDOM version does not expose the browser's Web Crypto API.
if (!window.crypto?.getRandomValues) {
  Object.defineProperty(window, 'crypto', { configurable: true, value: webcrypto });
}
