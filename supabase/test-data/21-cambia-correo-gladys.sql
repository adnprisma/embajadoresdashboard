-- ---------------------------------------------------------------
-- Cambia el correo de acceso de Gladys Strevel (5ddc5080-...) a
-- gstrevelprisma@gmail.com. La cuenta duplicada que ya tenía ese correo
-- (a097e955-...) ya se borró desde el panel — este script asume que sí.
-- ---------------------------------------------------------------

-- 0) Confirma que el correo nuevo está libre de verdad. Si esto regresa
-- alguna fila, el borrado del duplicado no se completó del todo en alguna
-- de las dos tablas y el UPDATE de abajo va a fallar por el unique — hay
-- que resolver eso antes de seguir, no forzar el cambio.
select 'auth.users' as tabla, id, email
from auth.users
where email = 'gstrevelprisma@gmail.com'
union all
select 'auth.identities', user_id, identity_data->>'email'
from auth.identities
where identity_data->>'email' = 'gstrevelprisma@gmail.com';
-- Debe regresar 0 filas. Si regresa algo, PARA AQUÍ y avísame.

-- 1) El cambio real — auth.users y auth.identities juntas, atómico.
begin;

update auth.users
set email = 'gstrevelprisma@gmail.com'
where id = '5ddc5080-240a-48ae-b0e6-71cbe1931c72';

update auth.identities
set identity_data = jsonb_set(identity_data, '{email}', '"gstrevelprisma@gmail.com"')
where user_id = '5ddc5080-240a-48ae-b0e6-71cbe1931c72'
  and provider = 'email';

commit;

-- 2) profiles — nuestra tabla, aparte, sin riesgo de auth. Antes se
-- corrían juntos por error; separado a propósito esta vez.
update profiles
set email = 'gstrevelprisma@gmail.com'
where id = '5ddc5080-240a-48ae-b0e6-71cbe1931c72';

-- 3) Verifica que las tres coincidan antes de que Gladys intente entrar.
select
  p.email as profile_email,
  u.email as auth_email,
  ai.identity_data->>'email' as identity_email
from profiles p
join auth.users u on u.id = p.id
join auth.identities ai on ai.user_id = p.id and ai.provider = 'email'
where p.id = '5ddc5080-240a-48ae-b0e6-71cbe1931c72';
-- Las tres columnas deben decir gstrevelprisma@gmail.com.
