-- ---------------------------------------------------------------
-- Verificación de RLS y roles, después de correr 0009, 0010 y
-- 03-assign-roles.sql. Todo de solo lectura. Son 3 bloques — corre cada
-- uno por separado si el editor de esta cuenta solo acepta un statement
-- por pegado.
-- ---------------------------------------------------------------

-- Bloque 1: tablas de public SIN RLS activo. Vacío = todo protegido.
select tablename
from pg_tables
where schemaname = 'public'
  and rowsecurity = false;

-- Bloque 2: todas las políticas vigentes en public, para revisar que
-- "or is_admin()" quedó donde debía y que appointments_team_select sigue
-- igual.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- Bloque 3: qué rol tiene cada quien.
select email, full_name, role
from profiles
order by role, email;
