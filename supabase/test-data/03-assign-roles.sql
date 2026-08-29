-- ---------------------------------------------------------------
-- Asigna rol y nombre real a las 3 personas de la operación. Por UUID, no
-- por correo: es el identificador estable y no depende de que
-- profiles.email esté bien poblado. Corre esto después de 0009 y 0010.
--
-- Si el editor de esta cuenta solo corre un statement por pegado, corre
-- los 3 UPDATE por separado.
-- ---------------------------------------------------------------

update profiles
set role = 'admin', full_name = 'Nestor Espinosa'
where id = 'cf32e354-ce7b-47a3-8560-7e6f8cea4a9f';

update profiles
set role = 'seller', full_name = 'Gladys Strevel'
where id = '5ddc5080-240a-48ae-b0e6-71cbe1931c72';

update profiles
set role = 'seller', full_name = 'Valeria Coto'
where id = '1ee0df7c-188d-426e-9f25-25352abf8c34';
