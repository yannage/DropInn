-- Remember the exact offer attached to a payment so callbacks after the launch
-- week still validate against the original transaction.
alter table public.payment_orders add column if not exists discount_id text;
alter table public.payment_orders drop constraint if exists payment_orders_discount_id_check;
alter table public.payment_orders add constraint payment_orders_discount_id_check
 check (discount_id is null or discount_id ~ '^dsc_[a-z0-9]{26}$');
