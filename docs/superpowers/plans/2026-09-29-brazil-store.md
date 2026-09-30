# Nextgen Labs Brasil implementation plan

**Goal:** Replicate the Bolivia store in Brazilian Portuguese with an independent Supabase catalog priced in BRL.

**Architecture:** Keep the existing Next.js app and routes in the separate `nextgenlabs-br` repository. Apply the existing database migrations to the empty `nextgenlabs-br` Supabase project, then add a Brazil catalog migration. Keep service keys server-side. Do not mix Brazil orders with Bolivia orders.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Postgres and Storage, Vitest.

## Tasks

- [x] Verify Brazil repository and remote project are distinct; inventory migrations and product slugs.
- [x] Apply inherited migrations to the empty Brazil database and verify RLS, functions, catalog, and seed rows.
- [x] Create a Brazil catalog migration with approved BRL prices for the ten matching products, translated database copy, and two new products once their presentation and assets are specified.
- [x] Change price and date formatting, metadata, structured product currency, and app language to Portuguese/Brazil.
- [x] Translate public shopping flow, WhatsApp messages, PDF, and buyer-facing errors; preserve parser compatibility. Admin remains Spanish for the Spanish-speaking owner, with currency fields changed to R$.
- [x] Replace Bolivia shipping/city/payment behavior with Brazil configuration, keeping unpublished contact and payment data out of the public UI until supplied.
- [x] Run focused tests and typecheck; verify remote catalog and stock with the Supabase MCP.
- [ ] Run read-only browser checks after the private service role key is configured in .env.local; use genuine orders for any checkout/admin/PDF verification because the only Brazil database is production.
- [ ] Set production domain and review inherited product COAs and legal text before publication.

## Known inputs

Approved BRL prices: CJC 1200; GHK-Cu 800; GLOW 1250; GLP-3 Retatrutida 2100; KLOW 1500; NAD+ 950; Selank 600; Semax 600; Tesamorelin 950; Wolverine 1100; Kisspeptin 950; BPC-157 800.

Kisspeptin and BPC-157 doses, product photos/COAs remain pending. The user approved the existing Bolivia WhatsApp number temporarily, São Paulo as operating city, and R$ 35 freight. Payment is coordinated over WhatsApp. Domain and private service role key still need local configuration; inherited product COAs need lot review before publication.
