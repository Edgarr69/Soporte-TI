-- Subcategorías de maquinaria (hijas de maintenance_categories tipo 'maquinaria')
create table if not exists machine_subcategories (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references maintenance_categories(id) on delete cascade,
  name        text not null,
  is_active   boolean not null default true,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists machine_subcategories_category_id_idx on machine_subcategories(category_id);

alter table machine_subcategories enable row level security;

-- Lectura: usuarios autenticados
create policy "machine_subcategories_read" on machine_subcategories
  for select to authenticated using (true);

-- Escritura: solo admins (gestionado desde Server Actions con service role)
create policy "machine_subcategories_write" on machine_subcategories
  for all to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin_mantenimiento', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and role in ('admin_mantenimiento', 'super_admin')
    )
  );
