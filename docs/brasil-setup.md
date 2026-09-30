# Nextgen Labs Brasil: configuração e publicação

Esta loja usa o repositório `nextgenlabs-br` e **uma única base de dados brasileira, em produção**: o projeto Supabase `nextgenlabs-br` (`nztritrqjzhlngnokhdj`). Não há banco local, banco de homologação nem outro projeto Supabase para o Brasil. A loja boliviana usa seu projeto de produção separado, já existente.

## 1. Catálogo e preços

A base brasileira já contém dez produtos ativos, com preços definidos em reais e estoque inicial de dez unidades cada. Os valores estão em `supabase/migrations/20260930040149_brazil_catalog.sql`. Kisspeptin (R$ 950) e BPC-157 (R$ 800) aguardam dose, apresentação, imagens e COA; não estão publicados no catálogo.

Para editar um preço depois, acesse `/admin/produtos` na loja brasileira e altere o produto. O preço é armazenado no campo `public.products.price` do Supabase brasileiro. **Não** altere a base boliviana. O site formata o valor como BRL; o preço no banco deve ser o número em reais, sem `R$` (por exemplo, `1200`, não `120000`).

## 2. Configuração da aplicação

Copie `.env.example` para `.env.local` no seu computador. **`.env.local` é apenas um arquivo privado de configuração da aplicação; ele não cria nem executa uma base de dados local.** Preencha:

- `SUPABASE_URL`: já aponta para `https://nztritrqjzhlngnokhdj.supabase.co`.
- `SUPABASE_SERVICE_ROLE_KEY`: copie a chave **service_role** do painel do projeto Supabase brasileiro em Project Settings → API. Guarde-a só em `.env.local` e nas variáveis privadas do ambiente de produção. Nunca a publique nem a compartilhe no chat.
- `ADMIN_PASSWORD_HASH`: gere com `node scripts/hash-password.mjs`.
- `ADMIN_SESSION_SECRET`: gere com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
- `NEXT_PUBLIC_SITE_URL`: URL final do domínio brasileiro, com `https://` e sem barra final. Em desenvolvimento use `http://localhost:3000`.

Não é necessária a senha do banco PostgreSQL para o funcionamento da aplicação. Tanto a aplicação executada no computador quanto a aplicação publicada usam a mesma base brasileira de produção. Não execute `supabase start`, `supabase db reset` ou migrações de teste.

## 3. Executar e conferir

```bash
npm install
npm test
npx tsc --noEmit
npm run dev
```

Abra a página inicial, o catálogo e um produto. Adicione um produto ao carrinho: o preço deve estar em R$, o frete deve ser **R$ 35** e o botão deve abrir o WhatsApp com mensagem em português. O número continua temporariamente `+591 69437674`, conforme solicitado. Você pode abrir `/admin/produtos` para conferir os valores. **Qualquer edição no painel, pedido criado ou ajuste de estoque altera imediatamente a base de produção**; use pedidos reais para conferir a emissão de comprovantes.

## 4. Antes da publicação

Defina o domínio em `NEXT_PUBLIC_SITE_URL`. Confirme com a equipe comercial se as imagens e os certificados herdados correspondem aos lotes vendidos no Brasil. Revise os textos legais com assessoria local, configure as variáveis privadas na hospedagem e confirme o fluxo de pagamento pelo WhatsApp. Insira Kisspeptin e BPC-157 quando houver os dados e materiais pendentes.

## 5. Publicar no Vercel com subdomínio temporário

1. Revise as alterações da branch `codex/br-localization`, faça commit e envie a branch para `Ichurri/nextgenlabs-br`. Depois incorpore-a à branch de produção (`main`). **O GitHub ainda não contém essas alterações enquanto a branch local não for enviada.**
2. No Vercel, crie **um novo projeto** para `Ichurri/nextgenlabs-br`. Não reutilize o projeto `nextgenlabs` da Bolívia. Selecione a raiz do repositório como Root Directory e mantenha o preset **Next.js**. Configure Node.js **22.x** nas opções do projeto.
3. Em Project Settings → Environment Variables, configure para **Production** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH` e `ADMIN_SESSION_SECRET` com os valores do projeto brasileiro. Copie cada valor diretamente do arquivo privado ou do Supabase, sem publicá-lo no Git. O arquivo `.env.local` não é enviado automaticamente ao Vercel.
4. Faça o primeiro deploy. O Vercel atribuirá um domínio `*.vercel.app`. Copie o endereço real e cadastre `NEXT_PUBLIC_SITE_URL=https://...` em **Production**, sem barra final. Faça **redeploy** para atualizar URLs canônicas, sitemap e links de pedido.
5. Confira a página inicial, `/catalogo`, `/producto/ghk-cu`, o carrinho e o link de WhatsApp. Verifique que exibem português e reais. Só faça operações de escrita no painel para pedidos reais, porque a base brasileira é exclusivamente de produção.

A aplicação **não** requer outro banco Supabase, nem `.env.production` versionado. O projeto Vercel e o Supabase brasileiro são serviços distintos: o primeiro hospeda a aplicação; o segundo guarda o catálogo e os pedidos.
