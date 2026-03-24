// Centralized runtime configuration for front-end API endpoints.
(function initRuntimeConfig() {
  const defaults = {
    API_ORIGIN: 'http://localhost:3001',
  };

  const provided = window.APP_CONFIG || {};
  const apiOrigin = String(provided.API_ORIGIN || defaults.API_ORIGIN).replace(/\/$/, '');
  const apiBaseUrl = `${apiOrigin}/api`;

  window.APP_CONFIG = {
    ...provided,
    API_ORIGIN: apiOrigin,
    API_BASE_URL: apiBaseUrl,
    USERS_API: `${apiBaseUrl}/users`,
    CONFIG_PUBLIC_API: `${apiBaseUrl}/config/public`,
    COMPONENTS_API: `${apiBaseUrl}/components`,
    CARTS_API: `${apiBaseUrl}/carts`,
    BUILDS_API: `${apiBaseUrl}/builds`,
    ORDERS_API: `${apiBaseUrl}/orders`,
    PAYMENTS_API: `${apiBaseUrl}/payments`,
    LOGS_API: `${apiBaseUrl}/logs`,
    FEATURED_BUILDS_API: `${apiBaseUrl}/featured-builds`,
    COMPATIBILITY_API: `${apiBaseUrl}/compatibility`,
  };
})();
