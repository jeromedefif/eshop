-- pgjwt has no application references or recorded dependent objects.
-- RESTRICT intentionally refuses removal if a dependency appears.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
drop extension if exists pgjwt restrict;
