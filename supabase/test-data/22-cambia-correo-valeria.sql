-- ---------------------------------------------------------------
-- Cambia el correo de acceso de Valeria Coto (1ee0df7c-...) a
-- vale.cprisma@gmail.com. A diferencia de Gladys, no hay cuenta duplicada
-- que borrar primero — verificado antes: correo nuevo libre, sin choque.
-- ---------------------------------------------------------------

-- 0) Confirma que el correo nuevo sigue libre (por si algo cambió desde la
-- verificación). Debe regresar 0 filas.
select 'auth.users' as tabla, id, email
from auth.users
where email = 'vale.cprisma@gmail.com'
union all
select 'auth.identities', user_id, identity_data->>'email'
from auth.identities
where identity_data->>'email' = 'vale.cprisma@gmail.com';

-- 1) auth.users y auth.identities juntas, atómico.
begin;

update auth.users
set email = 'vale.cprisma@gmail.com'
where id = '1ee0df7c-188d-426e-9f25-25352abf8c34';

update auth.identities
set identity_data = jsonb_set(identity_data, '{email}', '"vale.cprisma@gmail.com"')
where user_id = '1ee0df7c-188d-426e-9f25-25352abf8c34'
  and provider = 'email';

commit;

-- 2) profiles, aparte.
update profiles
set email = 'vale.cprisma@gmail.com'
where id = '1ee0df7c-188d-426e-9f25-25352abf8c34';

-- 3) Verifica que las tres coincidan antes de que Valeria intente entrar.
select
  p.email as profile_email,
  u.email as auth_email,
  ai.identity_data->>'email' as identity_email
from profiles p
join auth.users u on u.id = p.id
join auth.identities ai on ai.user_id = p.id and ai.provider = 'email'
where p.id = '1ee0df7c-188d-426e-9f25-25352abf8c34';
