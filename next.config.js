// Configuración de Next.js con Sentry
const { withSentryConfig } = require('@sentry/nextjs');

const moduleExports = {
  reactStrictMode: true,
  // Deshabilitar ESLint durante la compilación en producción
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Activado SWC minifier para mejor rendimiento
  swcMinify: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false,
      },
    ];
  },
};

// Opciones del plugin Sentry (sin silenciamiento estricto)
const sentryWebpackPluginOptions = {
  silent: true,
  dryRun: process.env.NODE_ENV !== 'production' || !process.env.SENTRY_AUTH_TOKEN,
};

// Conditional export: only use Sentry wrapper if token exists or we are strictly in production build with intended sourcemaps
const shouldEnableSentry = !!process.env.SENTRY_AUTH_TOKEN;

module.exports = shouldEnableSentry
  ? withSentryConfig(moduleExports, sentryWebpackPluginOptions)
  : moduleExports;
