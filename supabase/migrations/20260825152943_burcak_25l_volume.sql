-- Deployment-safe transition: allow 25L alongside the former 30L value.
-- The application only displays 25L after deployment, while an older running
-- instance can still finish an in-progress 30L order during the rollout.
-- Historical order_items remain unchanged.
update public.products
set allowed_volumes = array_append(allowed_volumes, '25')
where category = 'Burčák'
  and not ('25' = any(allowed_volumes));
