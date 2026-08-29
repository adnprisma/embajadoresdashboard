-- ---------------------------------------------------------------
-- Cambio de modelo: de dueño único a admin + vendedoras (sellers).
-- Ver 0010_rls_admin.sql para las políticas que usan is_admin().
-- ---------------------------------------------------------------

alter table profiles
  add column role text not null default 'seller' check (role in ('admin', 'seller'));

-- security definer es obligatorio aquí: is_admin() consulta profiles, y la
-- política de profiles (0010) también llama is_admin() — sin security
-- definer, evaluar la función dispararía de nuevo la política de RLS de
-- profiles, que volvería a llamar is_admin(), en recursión infinita.
-- security definer corre el select interno con los privilegios del dueño
-- de la función, que no está sujeto a esa política.
create function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(select 1 from profiles where id = auth.uid() and role = 'admin');
$$;
