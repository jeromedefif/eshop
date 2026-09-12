-- Backfill only attributes that are explicitly encoded in existing product names.
-- Existing administrator-entered values are never overwritten.

update public.products
set product_color = case
  when lower(name) like any (array['%bílé%', '%bílý%', '%bílá%']) then 'white'
  when lower(name) like any (array['%červené%', '%červený%', '%červená%'])
    or lower(name) ~ '(^|[[:space:],;(])rot([[:space:],;)]|$)' then 'red'
  when lower(name) like any (array['%růžové%', '%růžový%', '%růžová%', '%růžovka%', '%rosé%', '%rose%']) then 'rose'
  else product_color
end
where product_color is null
  and category in ('Víno', 'Perlivé', 'Nápoje', 'Ovocné víno', 'Burčák');

update public.products
set sweetness = case
  when lower(name) like any (array['%polosuché%', '%polosuchý%', '%polosuchá%']) then 'semi_dry'
  when lower(name) like any (array['%polosladké%', '%polosladký%', '%polosladká%']) then 'semi_sweet'
  when lower(name) like any (array['%sladké%', '%sladký%', '%sladká%']) then 'sweet'
  when lower(name) like any (array['%suché%', '%suchý%', '%suchá%']) then 'dry'
  when lower(name) ~ '(^|[[:space:],;(])psl([[:space:],;)]|$)' then 'semi_sweet'
  when lower(name) ~ '(^|[[:space:],;(])sl([[:space:],;)]|$)' then 'sweet'
  when lower(name) ~ '(^|[[:space:],;(])p([[:space:],;)]|$)' then 'semi_dry'
  when lower(name) ~ '(^|[[:space:],;(])s([[:space:],;)]|$)' then 'dry'
  else sweetness
end
where sweetness is null
  and category in ('Víno', 'Perlivé', 'Nápoje', 'Ovocné víno', 'Burčák');
