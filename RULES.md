# PowerUp Architecture Rules

Route files inside app/ must be thin wrappers only.

Business logic must live inside src/features/<feature>/.

Use Redux Toolkit for global state.

Use RTK Query for API requests.

Use NativeWind instead of StyleSheet where possible.

Use TypeScript strict mode.

Avoid any type.

Prefer named exports.

Keep components small and feature-scoped.