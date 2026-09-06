import '@testing-library/jest-dom';

// jsdom lacks ResizeObserver, which Recharts' ResponsiveContainer needs.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverMock as never);
