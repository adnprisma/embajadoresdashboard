-- ---------------------------------------------------------------
-- Verificación pedida: rol de cada perfil, y cuántos contactos tiene
-- asignado cada uno (deben sumar 187).
-- ---------------------------------------------------------------

-- 1) Rol de cada perfil
select id, full_name, email, role
from profiles
order by full_name;

-- 2) Contactos por dueño (incluye perfiles con 0, vía left join)
select p.full_name, p.role, count(c.id) as contactos
from profiles p
left join contacts c on c.owner_id = p.id
group by p.id, p.full_name, p.role
order by p.full_name;

-- 3) Total (debe dar 187)
select count(*) as total_contactos from contacts;
