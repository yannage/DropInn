import { reconcilePayments } from '../../server/payments';
export default async () => {
  const result = await reconcilePayments();
  console.log('Payment reconciliation', result);
};
export const config = { schedule: '*/5 * * * *' };
