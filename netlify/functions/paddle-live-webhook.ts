import { handlePaddleWebhook } from '../../server/payments';

// A separate endpoint lets live Paddle notifications be verified without
// changing the public site's sandbox checkout or its existing destination.
export default (request: Request) => handlePaddleWebhook(request, {
  ...process.env,
  PADDLE_ENVIRONMENT: 'production',
});
