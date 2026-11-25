/* © 2026 Dutchkem Ventures. Proprietary and confidential. Unauthorized copying, modification, or distribution is strictly prohibited. */

/* Terminal error handler.
 * Never leaks a stack, an SQL statement, a provider response or an env value to
 * the client: 4xx errors that set `err.status` get a sanitised message, anything
 * else is reported as a plain 500. Full detail goes to the server log only.
 */

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const status = Number.isInteger(err && err.status) && err.status >= 400 && err.status < 600
    ? err.status
    : 500;

  const message = status >= 500
    ? 'Internal server error'
    : (err && typeof err.message === 'string' && err.message) || 'Request failed';

  console.error(
    '[error] ' + req.method + ' ' + (req.originalUrl || req.url) + ' → ' + status + ': ' +
    ((err && err.message) || 'unknown error')
  );

  if (status >= 500 && err && err.stack) {
    console.error(err.stack);
  }

  res.status(status).json({
    ok: false,
    error: status >= 500 ? 'internal_error' : (err && err.code) || 'request_failed',
    message: message,
  });
}

module.exports = errorHandler;
module.exports.errorHandler = errorHandler;
