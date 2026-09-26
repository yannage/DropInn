import { handlePaddleWebhook } from '../../server/payments';

// The original notification destination always uses sandbox credentials.
export default (request: Request) => handlePaddleWebhook(request, { ...process.env, PADDLE_ENVIRONMENT: 'sandbox' });
