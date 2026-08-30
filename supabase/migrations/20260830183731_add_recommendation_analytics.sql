alter table public.analytics_events
  drop constraint analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check
  check (event_name in (
    'catalog_opened',
    'first_item_added',
    'order_summary_opened',
    'order_submitted',
    'template_used',
    'history_order_used',
    'recommendations_shown',
    'recommendation_added'
  ));

alter table public.analytics_events
  drop constraint analytics_events_source_check;

alter table public.analytics_events
  add constraint analytics_events_source_check
  check (source is null or source in (
    'catalog',
    'template',
    'history',
    'latest_order',
    'recommendation'
  ));
