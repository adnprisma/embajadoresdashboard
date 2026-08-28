-- ---------------------------------------------------------------
-- Corrige pipeline_stages.accent en bases ya sembradas con 0004_seed.sql
-- (que usaba 'progress'/'positive' como identidad de etapa, no desenlace).
-- Ver context/DESIGN_SYSTEM.md §2 "Acento de etapa en el pipeline".
-- Un solo statement — el editor SQL de Supabase no ejecuta bloques DO
-- de forma confiable en esta cuenta.
-- ---------------------------------------------------------------
update pipeline_stages set accent = case id
  when 'new' then 'neutral'
  when 'analysis' then 'neutral'
  when 'scheduled' then 'neutral'
  when 'show' then 'neutral'
  when 'no_show' then 'pending'
  when 'won' then 'positive'
  when 'churn' then 'negative'
  when 'nurturing' then 'pending'
  when 'discarded' then 'negative'
  else accent
end;
