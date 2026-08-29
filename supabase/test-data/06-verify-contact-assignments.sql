-- ---------------------------------------------------------------
-- Rastro de reasignaciones, con nombres en vez de UUID sueltos para poder
-- leerlo de un vistazo. Solo lectura.
-- ---------------------------------------------------------------

select
  ca.created_at,
  c.business_name,
  coalesce(pf.full_name, pf.email, '(sin dueño anterior)') as de,
  coalesce(pt.full_name, pt.email) as a,
  coalesce(pa.full_name, pa.email) as autorizado_por,
  ca.reason
from contact_assignments ca
join contacts c on c.id = ca.contact_id
left join profiles pf on pf.id = ca.from_owner
left join profiles pt on pt.id = ca.to_owner
left join profiles pa on pa.id = ca.assigned_by
order by ca.created_at desc;
