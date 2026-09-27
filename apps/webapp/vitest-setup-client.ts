import '@testing-library/jest-dom/vitest';
import './src/app.css';

/**
 * The stylesheet is imported so component tests run against real
 * styles. Without it, anything that depends on layout or visibility
 * (focus order, overflow, a Bits UI portal's positioning) behaves
 * differently in the test than in the app.
 */
