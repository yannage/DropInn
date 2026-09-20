-- Read-only, aggregate pilot proxies from hosted V2 data. Run as a database
-- administrator with read access to adventure_rooms/adventure_events.
-- No schema, player records, or game state are changed by this script.
--
-- Limits:
-- * First action means seat arrival -> resolved contribution (including Protect
--   and older rolled actions), NOT page launch,
--   clicking Play Now, waiting for admission, or the moment an action is committed.
-- * Visits begin at arrival events and end at departure or adventure completion.
--   Unfinished visits are excluded from duration; elapsed time includes waiting.
-- * Return visits count repeated arrivals by the same anonymous user identity,
--   including rejoining the same room. This does not measure return motivation.
-- * Completion is a room-level ratio, not retention or individual satisfaction.
-- * Existing events do not establish subjective quality or actual app-open time.

with event_rows as (
  select room_code, event_id, entry->>'kind' as kind,
         entry->>'actorId' as user_id,
         (entry->>'at')::bigint as at_ms,
         (entry->>'contribution' = 'true' or entry->>'roll' is not null) as is_contribution
  from public.adventure_events
), arrivals as (
  select room_code, user_id, at_ms as arrived_at_ms,
         lead(at_ms) over (
           partition by room_code, user_id order by at_ms, event_id
         ) as next_arrival_ms
  from event_rows
  where kind = 'arrival' and user_id is not null
), room_completion as (
  select r.code,
         max((outcome->>'at')::bigint) filter (
           where r.status = 'completed'
         ) as completed_at_ms
  from public.adventure_rooms r
  left join lateral jsonb_array_elements(
    coalesce(r.snapshot->'outcomes', '[]'::jsonb)
  ) outcome on true
  group by r.code
), visit_bounds as (
  select a.*,
         least(departure.at_ms, c.completed_at_ms) as ended_at_ms
  from arrivals a
  left join room_completion c on c.code = a.room_code
  left join lateral (
    select min(e.at_ms) as at_ms
    from event_rows e
    where e.room_code = a.room_code and e.user_id = a.user_id
      and e.kind = 'departure' and e.at_ms >= a.arrived_at_ms
      and (a.next_arrival_ms is null or e.at_ms < a.next_arrival_ms)
  ) departure on true
), visits as (
  select v.*, contributions.first_action_ms, contributions.action_count
  from visit_bounds v
  left join lateral (
    select min(e.at_ms) as first_action_ms, count(*) as action_count
    from event_rows e
    where e.room_code = v.room_code and e.user_id = v.user_id
      and e.kind = 'action' and e.is_contribution
      and e.at_ms >= v.arrived_at_ms
      and (v.ended_at_ms is null or e.at_ms <= v.ended_at_ms)
      and (v.next_arrival_ms is null or e.at_ms < v.next_arrival_ms)
  ) contributions on true
), people as (
  select user_id, count(*) as visit_count from visits group by user_id
), visit_summary as (
  select count(*) as observed_visits,
         count(*) filter (where ended_at_ms is not null) as ended_visits,
         count(*) filter (where first_action_ms is not null) as visits_with_an_action,
         round((percentile_cont(0.5) within group (
           order by (first_action_ms - arrived_at_ms) / 1000.0
         ))::numeric, 1) as median_seat_to_resolved_action_seconds,
         round((percentile_cont(0.5) within group (
           order by (ended_at_ms - arrived_at_ms) / 60000.0
         ))::numeric, 1) as median_ended_visit_minutes,
         round(avg(action_count)::numeric, 1) as mean_actions_per_observed_visit
  from visits
), room_summary as (
  select count(*) as rooms_created,
         count(*) filter (where status = 'completed') as rooms_completed,
         round(100.0 * count(*) filter (where status = 'completed') /
           nullif(count(*), 0), 1) as room_completion_percent
  from public.adventure_rooms
), return_summary as (
  select count(*) as observed_people,
         count(*) filter (where visit_count > 1) as people_with_repeat_arrivals,
         round(100.0 * count(*) filter (where visit_count > 1) /
           nullif(count(*), 0), 1) as repeat_arrival_percent
  from people
)
select * from visit_summary cross join room_summary cross join return_summary;
