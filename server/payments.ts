import { createHmac, timingSafeEqual } from 'node:crypto';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { SUPPORTER_BUNDLE, type PaymentConfig, type PaymentEnvironment, type Purchase } from '../src/lib/dropinn/payments';

type Env = Record<string, string | undefined>;
type Fetch = typeof globalThis.fetch;
export class PaymentError extends Error { constructor(message: string, public status = 400, public creationRejected = false) { super(message); } }
interface Order {
  id: string; player_id: string; environment: PaymentEnvironment; request_id: string; bundle_id: string;
  bundle_version: number; price_id: string; transaction_id: string | null; status: Purchase['status']; created_at: string;
}
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const txnId = (v: unknown): v is string => typeof v === 'string' && /^txn_[a-z0-9]{26}$/.test(v);
export const paymentEnvironment = (env: Env): PaymentEnvironment => env.PADDLE_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
export function paymentConfig(env: Env): PaymentConfig | undefined {
  if (!env.PADDLE_ENVIRONMENT) return;
  const environment = paymentEnvironment(env);
  const token = env.PADDLE_CLIENT_TOKEN ?? '';
  const configured = token.startsWith(environment === 'sandbox' ? 'test_' : 'live_') && !!env.PADDLE_API_KEY && !!env.PADDLE_WEBHOOK_SECRET;
  return { environment, enabled: configured && env.DROPINN_PAYMENTS_ENABLED === '1', clientToken: configured ? token : '' };
}
function settings(env: Env) {
  if (!['sandbox', 'production'].includes(env.PADDLE_ENVIRONMENT ?? '')) throw new PaymentError('Payments are not configured yet.', 503);
  const environment = paymentEnvironment(env);
  const apiKey = env.PADDLE_API_KEY ?? '';
  if (!apiKey.startsWith(environment === 'sandbox' ? 'pdl_sdbx_apikey_' : 'pdl_live_apikey_')) throw new PaymentError('Payment credentials do not match the configured environment.', 503);
  return { environment, apiKey, base: environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com' };
}
function checked<T>(result: { data: T; error: { code?: string } | null }): T {
  if (result.error) throw new PaymentError(['42P01', '42883', 'PGRST202'].includes(result.error.code ?? '')
    ? 'Payments need the 202609260001_payments.sql database update.' : 'Payment records could not be saved. Please check again.', 503);
  return result.data;
}
const purchase = (order: Order): Purchase => ({ id: order.id, bundleId: order.bundle_id, environment: order.environment, status: order.status, transactionId: order.transaction_id });
async function paddle(env: Env, path: string, init: RequestInit = {}, fetcher: Fetch = fetch) {
  const { base, apiKey } = settings(env);
  if (!path.startsWith('/')) throw new PaymentError('Invalid payment request.', 503);
  let response: Response;
  try { response = await fetcher(`${base}${path}`, { ...init, headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Paddle-Version': '1' }, signal: AbortSignal.timeout(3500) }); }
  catch { throw new PaymentError('Payment confirmation is taking longer than expected. Check again; do not start another payment.', 503); }
  if (!response.ok) {
    // Never surface response bodies, customer details, or credentials to the client/log.
    console.error('Paddle request failed', response.status, path.split('?')[0]);
    throw new PaymentError(response.status === 401 || response.status === 403 ? 'The payment service key needs its configured permissions.' : 'The payment service could not complete that request. Check again shortly.', 503, response.status >= 400 && response.status < 500 && response.status !== 408);
  }
  return response.json();
}
export function validateTransaction(order: Order, transaction: any): Purchase['status'] {
  const item = transaction?.items?.[0];
  if (!txnId(transaction?.id) || transaction.custom_data?.dropinn_order_id !== order.id
    || transaction.custom_data?.dropinn_bundle_id !== order.bundle_id || transaction.custom_data?.dropinn_bundle_version !== order.bundle_version
    || transaction.items.length !== 1 || item?.quantity !== 1 || item.price?.id !== order.price_id
    || item.price.billing_cycle != null || transaction.subscription_id != null || transaction.discount_id != null
    || item.price.unit_price?.amount !== String(SUPPORTER_BUNDLE.amount) || item.price.unit_price?.currency_code !== 'USD'
    || transaction.currency_code !== 'USD' || transaction.collection_mode !== 'automatic') {
    throw new PaymentError('The payment does not match this purchase. Contact support with your purchase reference.', 409);
  }
  if (transaction.status === 'canceled') return 'canceled';
  if (transaction.status !== 'completed') return 'ready';
  if (!Object.hasOwn(transaction, 'adjustments')) throw new PaymentError('Payment adjustments could not be verified. Please check again.', 503);
  const approved = (transaction.adjustments ?? []).filter((a: any) => a.status === 'approved');
  if (approved.some((a: any) => a.action === 'refund')) return 'refunded';
  // A reversal restores access only when the provider's current adjustment set
  // accounts for all chargebacks. Warnings retain access while payment is valid.
  const chargebacks = approved.filter((a: any) => a.action === 'chargeback').length;
  const reversals = approved.filter((a: any) => a.action === 'chargeback_reverse').length;
  return chargebacks > reversals ? 'disputed' : 'completed';
}
async function applyTransaction(db: SupabaseClient, order: Order, transaction: any, observedAt: string, eventId?: string): Promise<Order> {
  const status = validateTransaction(order, transaction);
  return checked(await db.rpc('dropinn_payment_apply', { p_order: order.id, p_transaction: transaction.id, p_status: status, p_observed_at: observedAt, p_event_id: eventId ?? null })) as Order;
}
async function currentTransaction(env: Env, id: string, fetcher: Fetch = fetch) {
  const transaction = (await paddle(env, `/transactions/${id}?include=adjustments`, {}, fetcher)).data;
  // Paddle may omit the relationship when there are no adjustments. Confirm
  // that case explicitly rather than treating an incomplete response as paid.
  if (transaction.status === 'completed' && !Object.hasOwn(transaction, 'adjustments')) {
    const result = await paddle(env, `/adjustments?transaction_id=${id}`, {}, fetcher);
    if (!Array.isArray(result.data) || result.meta?.pagination?.has_more) throw new PaymentError('Payment adjustments need review.', 503);
    transaction.adjustments = result.data;
  }
  return transaction;
}
export async function reconcileOrder(db: SupabaseClient, env: Env, order: Order, fetcher: Fetch = fetch, eventId?: string): Promise<Order> {
  if (order.environment !== paymentEnvironment(env)) throw new PaymentError('Purchase environment mismatch.', 409);
  const observedAt = new Date().toISOString();
  if (order.transaction_id) {
    return applyTransaction(db, order, await currentTransaction(env, order.transaction_id, fetcher), observedAt, eventId);
  }
  // The create request might have succeeded while its response was lost. Never
  // create a second transaction for an uncertain order. Search existing ones.
  let path = `/transactions?per_page=30&order_by=id[DESC]&created_at[GTE]=${encodeURIComponent(order.created_at)}`;
  for (let page = 0; page < 5; page++) {
    const result = await paddle(env, path, {}, fetcher);
    const matches = result.data.filter((t: any) => t.custom_data?.dropinn_order_id === order.id);
    if (matches.length > 1) throw new PaymentError('More than one payment was found. Contact support with your purchase reference.', 409);
    if (matches.length) return reconcileOrder(db, env, { ...order, transaction_id: matches[0].id }, fetcher, eventId);
    if (!result.meta?.pagination?.has_more) return order;
    const next = new URL(result.meta.pagination.next);
    if (next.origin !== settings(env).base) throw new PaymentError('Invalid payment pagination.', 503);
    path = next.pathname + next.search;
  }
  return order;
}
export async function handlePayment(db: SupabaseClient, user: User, body: { operation: string; commandId?: string; orderId?: string; bundleId?: string }, env: Env, fetcher: Fetch = fetch) {
  if (user.is_anonymous || !user.email) throw new PaymentError('Sign in with Google or email before buying a supporter pack.', 401);
  const environment = settings(env).environment;
  const owners = checked(await db.from('player_ownership').select('player_id,account_id').eq('account_id', user.id)) ?? [];
  if (!owners.some(o => o.player_id === user.id)) throw new PaymentError('Sign in again to access your purchases.', 401);
  let order: Order | null;
  if (body.operation === 'payment-status') {
    let query = db.from('payment_orders').select('*').in('player_id', owners.map(o => o.player_id)).eq('environment', environment);
    if (body.orderId) {
      if (!uuid(body.orderId)) throw new PaymentError('Choose a valid purchase reference.');
      query = query.eq('id', body.orderId);
    }
    order = checked(await query.order('created_at', { ascending: false }).limit(1).maybeSingle()) as Order | null;
    if (!order && body.orderId) throw new PaymentError('That purchase is not available to your account.', 404);
    return { purchase: order ? purchase(await reconcileOrder(db, env, order, fetcher)) : null };
  }
  if (!paymentConfig(env)?.enabled) throw new PaymentError('New purchases are currently unavailable.', 503);
  if (body.bundleId !== SUPPORTER_BUNDLE.id || !uuid(body.commandId)) throw new PaymentError('Choose a valid bundle and purchase identifier.');
  const priceId = env.PADDLE_SUPPORTER_PRICE_ID ?? '';
  if (!/^pri_[a-z0-9]{26}$/.test(priceId)) throw new PaymentError('The supporter pack price is not configured.', 503);
  const price = (await paddle(env, `/prices/${priceId}`, {}, fetcher)).data;
  if (price.status !== 'active' || price.billing_cycle != null || price.trial_period != null
    || price.unit_price?.amount !== '1000' || price.unit_price.currency_code !== 'USD') throw new PaymentError('The supporter pack price needs review before checkout.', 503);
  const receipt = checked(await db.rpc('dropinn_payment_begin', { p_account: user.id, p_environment: environment, p_request_id: body.commandId, p_price_id: priceId }));
  order = receipt.order as Order;
  if (!receipt.create) return { purchase: purchase(await reconcileOrder(db, env, order, fetcher)) };
  const observedAt = new Date().toISOString();
  let result;
  try {
    result = await paddle(env, '/transactions', { method: 'POST', body: JSON.stringify({
      items: [{ price_id: order.price_id, quantity: 1 }], currency_code: 'USD', collection_mode: 'automatic',
      custom_data: { dropinn_order_id: order.id, dropinn_bundle_id: order.bundle_id, dropinn_bundle_version: order.bundle_version },
    }) }, fetcher);
  } catch (error) {
    if (error instanceof PaymentError && error.creationRejected) {
      checked(await db.from('payment_orders').update({ status: 'canceled', updated_at: new Date().toISOString() }).eq('id', order.id).eq('status', 'creating').is('transaction_id', null));
    }
    throw error;
  }
  // A new transaction is unpaid; completion always goes through current-state verification.
  if (result.data.status === 'completed') return { purchase: purchase(await reconcileOrder(db, env, { ...order, transaction_id: result.data.id }, fetcher)) };
  return { purchase: purchase(await applyTransaction(db, order, result.data, observedAt)) };
}

export function verifyPaddleSignature(raw: string, signature: string, secret: string, now = Date.now()) {
  if (!secret || raw.length > 1_000_000) return false;
  const parts = signature.split(';').map(p => p.trim().split('='));
  const timestamp = parts.find(([key]) => key === 'ts')?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}:${raw}`).digest();
  return parts.some(([key, value]) => key === 'h1' && /^[a-f0-9]{64}$/i.test(value ?? '') && timingSafeEqual(expected, Buffer.from(value, 'hex')));
}
export function paymentDatabase(env: Env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new PaymentError('Payment database is not configured.', 503);
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false }, realtime: { transport: WebSocket as unknown as typeof globalThis.WebSocket } });
}
export async function handlePaddleWebhook(request: Request, env: Env = process.env, dependencies: { db?: SupabaseClient; fetch?: Fetch } = {}): Promise<Response> {
  const response = (status: number, text: string) => new Response(text, { status, headers: { 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return response(405, 'Use POST.');
  try {
    const raw = await request.text();
    if (!verifyPaddleSignature(raw, request.headers.get('paddle-signature') ?? '', env.PADDLE_WEBHOOK_SECRET ?? '')) return response(401, 'Invalid signature.');
    const event = JSON.parse(raw);
    if (typeof event.event_id !== 'string' || !/^evt_[a-z0-9]{26}$/.test(event.event_id)) return response(400, 'Invalid event.');
    if (!['transaction.completed', 'transaction.updated', 'transaction.canceled', 'adjustment.created', 'adjustment.updated'].includes(event.event_type)) return response(200, 'Ignored event.');
    const transactionId = event.event_type.startsWith('transaction.') ? event.data?.id : event.data?.transaction_id;
    if (!txnId(transactionId)) return response(400, 'Invalid transaction.');
    const db = dependencies.db ?? paymentDatabase(env);
    const environment = settings(env).environment;
    const done = checked(await db.from('payment_events').select('event_id').eq('environment', environment).eq('event_id', event.event_id).maybeSingle());
    if (done) return response(200, 'Already recorded.');
    let order = checked(await db.from('payment_orders').select('*').eq('environment', environment).eq('transaction_id', transactionId).maybeSingle()) as Order | null;
    if (!order) {
      const observedAt = new Date().toISOString();
      const transaction = await currentTransaction(env, transactionId, dependencies.fetch);
      const orderId = transaction.custom_data?.dropinn_order_id;
      if (!uuid(orderId)) return response(200, 'Not a DropInn order.');
      order = checked(await db.from('payment_orders').select('*').eq('environment', environment).eq('id', orderId).maybeSingle()) as Order | null;
      if (!order) return response(200, 'Not a DropInn order.');
      // Leave an already-bound conflicting transaction untouched.
      if (order.transaction_id && order.transaction_id !== transactionId) throw new PaymentError('Conflicting provider transaction.', 409);
      await applyTransaction(db, order, transaction, observedAt, event.event_id);
    } else await reconcileOrder(db, env, order, dependencies.fetch, event.event_id);
    return response(200, 'Recorded.');
  } catch (error) {
    console.error('Payment callback deferred', error instanceof PaymentError ? error.status : 503);
    return response(503, 'Retry this notification.');
  }
}
export async function reconcilePayments(env: Env = process.env) {
  if (!env.PADDLE_ENVIRONMENT || !env.PADDLE_API_KEY) return { checked: 0, failed: 0 };
  const db = paymentDatabase(env);
  const orders = checked(await db.from('payment_orders').select('*').eq('environment', paymentEnvironment(env)).neq('status', 'canceled').neq('status', 'refunded').order('checked_at', { ascending: true, nullsFirst: true }).limit(20)) as Order[];
  let failed = 0;
  let count = 0;
  const deadline = Date.now() + 20000;
  const stop = AbortSignal.timeout(20000);
  const boundedFetch: Fetch = (input, init) => fetch(input, { ...init, signal: AbortSignal.any([stop, ...(init?.signal ? [init.signal] : [])]) });
  for (const order of orders) {
    if (Date.now() > deadline) break;
    try { await reconcileOrder(db, env, order, boundedFetch); }
    catch { failed++; }
    // Fair rotation includes unknown creation outcomes; never create a replacement charge.
    checked(await db.from('payment_orders').update({ checked_at: new Date().toISOString() }).eq('id', order.id));
    count++;
  }
  return { checked: count, failed };
}
