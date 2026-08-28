-- ---------------------------------------------------------------
-- Auditoría de seguridad — bloque 12 (/perfil)
-- Lista las políticas RLS vigentes en storage.objects (bucket
-- space-perfil) y en profiles, para confirmar que:
--   1. storage.objects: cada operación (select/insert/update/delete)
--      está restringida a (storage.foldername(name))[1] = auth.uid()::text
--      y acotada a bucket_id = 'space-perfil'.
--   2. profiles: select/update están restringidos a auth.uid() = id,
--      sin política adicional que amplíe la lectura de bank_data/tax_data.
--
-- Corre esto en el SQL Editor de Supabase (un statement a la vez si
-- el editor de esta cuenta corta el resultado al pegar varios).
-- ---------------------------------------------------------------

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (schemaname = 'storage' and tablename = 'objects')
   or (schemaname = 'public' and tablename = 'profiles')
order by tablename, cmd, policyname;

-- ---------------------------------------------------------------
-- Segundo statement (corre aparte si el editor solo acepta uno):
-- confirma que el bucket sigue marcado como privado. public = true
-- aquí anularía las políticas de arriba y expondría los objetos por
-- URL directa sin necesidad de firma.
-- ---------------------------------------------------------------

select id, name, public from storage.buckets where id = 'space-perfil';
