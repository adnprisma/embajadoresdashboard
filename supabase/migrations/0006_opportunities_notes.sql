-- ---------------------------------------------------------------
-- El bloque 9 (OpportunityDialog) pide un campo de notas por oportunidad
-- que 0001_schema.sql no contemplaba. Columna nueva, nullable, aditiva:
-- no rompe filas existentes.
-- ---------------------------------------------------------------
alter table opportunities add column notes text;
