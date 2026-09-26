import { handlePaddleWebhook } from '../../server/payments';
export default (request: Request) => handlePaddleWebhook(request);
