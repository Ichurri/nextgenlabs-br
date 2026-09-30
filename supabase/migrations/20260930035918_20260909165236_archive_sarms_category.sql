-- El dueño sacó "SARMs" del catálogo. La semilla de category_id ya corrió
-- contra el proyecto linkeado (20260731180247_product_catalog.sql), así que
-- no se toca esa migración — se reasigna cualquier producto que quedara en
-- "SARMs" a "Otros" y se archiva la categoría, igual que el botón "Archivar"
-- del panel (product_categories.is_active, ver /api/admin/categorias/[id]).
update products
set category_id = (select id from product_categories where name = 'Otros'),
    updated_at = now()
where category_id = (select id from product_categories where name = 'SARMs');

update product_categories
set is_active = false
where name = 'SARMs';
