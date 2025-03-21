# CSS Best Practices

This document outlines the CSS architecture and best practices for the Amazon Inventory Management System.

## Table of Contents

1. [CSS Module Implementation](#css-module-implementation)
2. [SafeStyles Pattern](#safestyles-pattern)
3. [Webpack Configuration](#webpack-configuration)
4. [Global CSS](#global-css)
5. [Third-Party CSS Libraries](#third-party-css-libraries)
6. [Testing and Troubleshooting](#testing-and-troubleshooting)

## CSS Module Implementation

The application uses CSS Modules for component-specific styling. This approach provides several benefits:

- Local scope for CSS classes
- Prevention of style conflicts between components
- Better organization of styles
- Improved maintainability

### Basic Usage

```jsx
// Import CSS module
import styles from './Component.module.css';

// Use CSS module classes
function Component() {
  return <div className={styles.container}>Content</div>;
}
```

## SafeStyles Pattern

To prevent rendering failures during server-side rendering or when CSS modules are not fully loaded, we implement the SafeStyles pattern:

```jsx
// Import CSS module
import styles from './Component.module.css';

// Create safe fallback object
const safeStyles = {
  'container': styles?.container || '',
  'header': styles?.header || '',
  'button': styles?.button || '',
  // Add all CSS classes used in the component
};

// Use safeStyles in component
function Component() {
  return (
    <div className={safeStyles.container}>
      <h1 className={safeStyles.header}>Heading</h1>
      <button className={safeStyles.button}>Click Me</button>
    </div>
  );
}
```

This pattern ensures components don't crash if CSS modules fail to load properly, which can happen during:
- Server-side rendering
- Production builds
- Hot module reloading
- Initial page load

## Webpack Configuration

The application uses a custom webpack configuration in `next.config.js` to properly handle CSS modules:

```javascript
// In next.config.js
const nextConfig = {
  // ... other config
  webpack: (config) => {
    // Configure CSS modules to only apply to local CSS files, not node_modules
    const rules = config.module.rules
      .find((rule) => typeof rule.oneOf === 'object')
      .oneOf.filter((rule) => Array.isArray(rule.use));

    rules.forEach((rule) => {
      rule.use.forEach((moduleLoader) => {
        if (
          moduleLoader.loader?.includes('css-loader') &&
          !moduleLoader.loader?.includes('postcss-loader')
        ) {
          if (moduleLoader.options.modules) {
            moduleLoader.options.modules.auto = (resourcePath) => !resourcePath.includes('node_modules');
          }
        }
      });
    });

    return config;
  }
};
```

This configuration ensures that:
1. CSS modules are only applied to local CSS files
2. CSS from `node_modules` is treated as global CSS
3. There are no conflicts between local and third-party styles

## Global CSS

Global styles should be limited to:

- Reset styles
- Typography
- Theme variables
- Third-party library imports

Global styles are defined in:
```
/styles/globals.css
```

Example of proper global CSS usage:

```css
/* globals.css */

/* Reset */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Typography */
body {
  font-family: 'Roboto', sans-serif;
  line-height: 1.5;
}

/* Theme variables */
:root {
  --primary-color: #0070f3;
  --secondary-color: #ff4081;
  --text-color: #333;
  --background-color: #fff;
}

/* Third-party library imports */
@import 'handsontable/dist/handsontable.full.css';
```

## Third-Party CSS Libraries

For third-party libraries with their own CSS:

1. Import the CSS in `globals.css`
2. Or import directly in `_app.js`
3. Ensure the webpack configuration properly handles these imports

Example:
```jsx
// In _app.js
import 'handsontable/dist/handsontable.full.css';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

## Testing and Troubleshooting

### Common CSS Issues

1. **CSS Module Loading Failures**
   - Symptoms: "Cannot read property of undefined" errors
   - Solution: Implement SafeStyles pattern

2. **Global CSS vs. CSS Module Conflicts**
   - Symptoms: Inconsistent styling, some styles not applying
   - Solution: Use proper webpack configuration, avoid mixing approaches

3. **Third-Party CSS Integration Issues**
   - Symptoms: Library components are unstyled or broken
   - Solution: Import third-party CSS in globals.css or _app.js

### Testing CSS

1. **Development Testing**
   ```bash
   npm run dev
   ```

2. **Production Build Testing**
   ```bash
   npm run build
   npm run start
   ```

3. **Visual Regression Testing**
   - Use Puppeteer to automate visual testing
   - See `puppeteer-test.js` for examples

4. **Browser Compatibility Testing**
   - Test in Chrome, Firefox, Safari, and Edge
   - Use responsive design mode to test different screen sizes

### CSS Linting

Consider adding stylelint to enforce CSS best practices:

```bash
npm install --save-dev stylelint stylelint-config-standard
```

Create a `.stylelintrc.json` file:
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "selector-class-pattern": null
  }
}
```

Run stylelint:
```bash
npx stylelint "**/*.css"
```