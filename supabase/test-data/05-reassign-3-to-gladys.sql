-- ---------------------------------------------------------------
-- Prueba de reassign_contacts(): mueve 3 contactos cualesquiera de tu
-- cuenta (Nestor) a Gladys. No hace falta elegir IDs a mano — toma los 3
-- primeros que encuentre bajo tu owner_id.
--
-- Corre esto DESPUÉS de aplicar 0011_contact_assignments.sql. Como corre
-- desde el SQL Editor (sin sesión), hay que pasar p_assigned_by
-- explícito — aquí mismo, con tu UUID de admin.
-- ---------------------------------------------------------------

select reassign_contacts(
  p_contact_ids   => (
    select array_agg(id)
    from (
      select id from contacts
      where owner_id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'
      limit 3
    ) t
  ),
  p_to_owner      => '5ddc5080-240a-48ae-b0e6-71cbe1931c72', -- Gladys
  p_reason        => 'Prueba de reasignación',
  p_assigned_by   => 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f'  -- Nestor (admin)
) as contactos_movidos;
