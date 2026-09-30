-- Catálogo independente do Brasil. Os valores abaixo são preços finais em BRL,
-- fornecidos pelo proprietário; nunca são conversões de BOB.
-- Kisspeptin e BPC-157 ficam pendentes até haver dose, apresentação e imagens.

update public.product_categories
set name = case name
  when 'Péptidos' then 'Peptídeos'
  when 'Blends' then 'Combinações'
  when 'Otros' then 'Outros'
  else name
end
where name in ('Péptidos', 'Blends', 'Otros');

do $$
begin
  if (select count(*) from public.products where slug in (
    'cjc-1295-no-dac-ipamorelin', 'ghk-cu', 'glow', 'glp-3-rt', 'klow',
    'nad-plus', 'selank', 'semax', 'tesamorelin', 'wolverine'
  )) <> 10 then
    raise exception 'Brazil catalog expects all ten inherited products';
  end if;
end;
$$;

update public.products as p
set name = br.name,
    dose = br.dose,
    price = br.price,
    form = 'Liofilizado',
    highlights = br.highlights,
    description = 'Produto destinado exclusivamente à pesquisa laboratorial. Não destinado ao consumo humano ou animal.',
    updated_at = now()
from (values
  ('cjc-1295-no-dac-ipamorelin', 'CJC 1295 sem DAC + Ipamorelina', '5 MG + 5 MG', 1200.00::numeric,
   array['CJC 1295 sem DAC: 5 mg', 'Ipamorelina: 5 mg', 'Certificado de análise disponível']::text[]),
  ('ghk-cu', 'GHK-Cu', '100 MG', 800.00::numeric,
   array['Peptídeo de cobre GHK-Cu', 'Frasco de 100 mg', 'Certificado de análise disponível']::text[]),
  ('glow', 'GLOW Blend', '70 MG', 1250.00::numeric,
   array['GHK-Cu: 50 mg (71,4%)', 'BPC-157: 10 mg (14,3%)', 'TB-500: 10 mg (14,3%)']::text[]),
  ('glp-3-rt', 'GLP-3 Retatrutida', '30 MG', 2100.00::numeric,
   array['Retatrutida: 30 mg', 'Uso exclusivo em pesquisa laboratorial', 'Certificado de análise disponível']::text[]),
  ('klow', 'KLOW (KPV/GHK-Cu/BPC-157/TB-500)', '80 MG', 1500.00::numeric,
   array['Combinação de KPV, GHK-Cu, BPC-157 e TB-500', 'Frasco de 80 mg', 'Certificado de análise disponível']::text[]),
  ('nad-plus', 'NAD+', '500 MG', 950.00::numeric,
   array['NAD+: 500 mg', 'Uso exclusivo em pesquisa laboratorial', 'Certificado de análise disponível']::text[]),
  ('selank', 'Selank', '5 MG', 600.00::numeric,
   array['Selank: 5 mg', 'Uso exclusivo em pesquisa laboratorial', 'Certificado de análise disponível']::text[]),
  ('semax', 'Semax', '5 MG', 600.00::numeric,
   array['Semax: 5 mg', 'Uso exclusivo em pesquisa laboratorial', 'Certificado de análise disponível']::text[]),
  ('tesamorelin', 'Tesamorelina', '10 MG', 950.00::numeric,
   array['Tesamorelina: 10 mg', 'Uso exclusivo em pesquisa laboratorial', 'Certificado de análise disponível']::text[]),
  ('wolverine', 'WOLVERINE (BPC-157 + TB-500)', '5 MG + 5 MG', 1100.00::numeric,
   array['BPC-157: 5 mg', 'TB-500: 5 mg', 'Certificado de análise disponível']::text[])
) as br(slug, name, dose, price, highlights)
where p.slug = br.slug;
