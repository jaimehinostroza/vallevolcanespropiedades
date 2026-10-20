-- Fotos de ejemplo: se sirven desde la CDN de Unsplash (licencia libre) en vez de Storage.
-- Solo se acepta ese origen; las fotos reales de la dueña siguen yendo a Storage.
alter table public.property_images
  add column source_url text
  check (source_url is null or source_url ~ '^https://images\.unsplash\.com/photo-[A-Za-z0-9-]+$');
