-- ---------------------------------------------------------------
-- Bucket "space-perfil" para el bloque 12 (/perfil): avatar + documentos
-- de respaldo (comprobantes bancarios/fiscales). PRIVADO a propósito — los
-- documentos pueden incluir datos fiscales/bancarios sensibles, así que no
-- hay lectura pública ni siquiera para el avatar (se muestra vía URL
-- firmada, no vía getPublicUrl()).
--
-- Layout de carpetas dentro del bucket: {auth.uid()}/avatar.<ext> y
-- {auth.uid()}/documents/<archivo>. Las políticas de storage.objects
-- restringen cada operación a la carpeta del propio usuario, igual que
-- profiles_update_own restringe la fila de profiles.
--
-- El editor SQL de Supabase de esta cuenta solo ejecuta un statement
-- confiable por corrida (ver notas en supabase/test-data/) — si al pegar
-- todo el archivo algo falla o queda a medias, corre cada statement por
-- separado.
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public) values ('space-perfil', 'space-perfil', false);

create policy "space_perfil_select_own"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'space-perfil' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "space_perfil_insert_own"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'space-perfil' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "space_perfil_update_own"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'space-perfil' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'space-perfil' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "space_perfil_delete_own"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'space-perfil' and (storage.foldername(name))[1] = auth.uid()::text);
