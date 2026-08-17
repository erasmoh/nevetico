-- El rol service_role (usado por el admin client para bypass de RLS:
-- cola de emails, operaciones internas) tampoco recibe grants automáticos
-- en las versiones nuevas de Supabase. Le damos acceso total en public.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
