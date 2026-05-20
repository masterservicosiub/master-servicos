
# Loja online — Serviços Gráficos

## 1. Banco de dados (nova migration)

Criar 3 tabelas novas (mantenho as antigas de `budget_services` intactas, usadas pela página de serviços residenciais):

- **`shop_products`** — produtos da loja
  - `id`, `slug` (único, gerado do nome), `name`, `description` (markdown curto), `active` (bool), `sort_order` (int), `created_at`
  - `base_price_mode` (`unit` | `area` | `fixed`) — modo padrão quando não há variação selecionada
  - `base_unit_price` (numeric), `base_area_price_per_m2` (numeric), `base_min_price` (numeric)

- **`shop_product_images`** — até 5 fotos por produto
  - `id`, `product_id` (fk), `image_url`, `is_primary` (bool — usada no OG), `sort_order`

- **`shop_product_variations`** — até 5 variações por produto, cada uma com seu modo de preço
  - `id`, `product_id` (fk), `label` (ex: "Cartão 4x0 — 9x5cm")
  - `price_mode` (`unit` | `area` | `fixed`)
  - `unit_price`, `area_price_per_m2`, `fixed_price`, `min_price`
  - `sort_order`

RLS: leitura pública nas três; escrita exige admin (mesmo padrão das tabelas existentes).

Reaproveito a tabela de **cupons já existente** (`coupons` ou equivalente — vou confirmar lendo o código). Cupom aplica desconto sobre o total do carrinho.

## 2. Admin (`/admin`)

Nova aba **"Produtos da Loja"** com:
- Listagem dos produtos (drag para reordenar, toggle ativo).
- Editor por produto:
  - Nome, slug auto, descrição, sort_order, ativo
  - Preço base (modo + valores)
  - Bloco "Fotos" — inputs de URL com botão de upload (até 5), marca uma como principal
  - Bloco "Variações" — até 5, cada uma com label, modo de preço e campos correspondentes
- Botão "Novo produto"
- Botão "Copiar link do produto"

## 3. Página da loja (`/servicos-graficos`)

Substituo o atual `<Orcamento kind="grafico" />` por um novo componente `Loja`:
- Grid de produtos com foto principal, nome, preço a partir de
- Cada card linka para `/produto/:slug`

## 4. Página de produto (`/produto/:slug`)

- Galeria de fotos (carrossel)
- Nome, descrição
- Seletor de variação (radio) → atualiza preço
- Campo de quantidade ou área (m²) conforme o modo da variação selecionada (ou modo base se sem variação)
- Botão "Adicionar ao carrinho"
- `<Helmet>` com og:title, og:description, og:image apontando para a foto principal (funciona para Googlebot; preview no WhatsApp usa o HTML servido pela edge function — ver §6)

## 5. Carrinho e checkout (`/carrinho`)

- Estado persistido em `localStorage` (sem login obrigatório)
- Lista de itens: foto, nome, variação, qtde/área, preço unitário, subtotal, botão remover
- Campo de **cupom** com validação (reaproveita a lógica atual de cupons)
- Total com desconto
- Botão "Finalizar pedido via WhatsApp" — abre WhatsApp com mensagem formatada do pedido (mesmo padrão usado hoje no orçamento). Sem gateway de pagamento nesta etapa.

Ícone de carrinho no `Header` com contador de itens.

## 6. Edge function `product-og` — preview no WhatsApp

Vou usar a **mesma URL** `/produto/:slug` para humanos e crawlers, distinguindo por User-Agent **no nível da edge function**.

Como o app é SPA hospedado por Lovable, não consigo interceptar a rota raiz. Solução prática: o link compartilhável será **`https://mastersolucoes.lovable.app/p/:slug`** (servido pela edge function), que:
- Detecta crawler (WhatsApp/Facebook/Twitter/LinkedIn via UA) → retorna HTML mínimo com `<meta property="og:*">` apontando para a foto principal do produto consultada no banco.
- Detecta navegador → redireciona 302 para `/produto/:slug`.

O botão "Copiar link" no admin e o botão "Compartilhar" na página do produto entregam a URL `/p/:slug`.

## 7. Cabeçalho

- Trocar link "Serviços Gráficos" continua apontando para `/servicos-graficos` (agora loja).
- Adicionar ícone de carrinho com badge de contagem.

---

## Detalhes técnicos

- **Slugs**: gerados no admin a partir do nome (slugify simples), editáveis, únicos via constraint.
- **Cálculo de preço por item do carrinho**:
  ```
  mode = variation?.price_mode ?? product.base_price_mode
  raw = mode === "fixed" ? fixed_price
      : mode === "unit" ? unit_price * qty
      : area_price_per_m2 * area
  subtotal = max(raw, min_price)
  ```
- **Storage de fotos**: por enquanto inputs de URL (mesmo padrão do `affiliate_materials.image_url` recém-adicionado). Bucket de upload pode vir depois se quiser.
- **Edge function**: `supabase/functions/product-og/index.ts` com CORS, lê do banco usando `SUPABASE_SERVICE_ROLE_KEY`, retorna `text/html`.
- **Rotas novas em `App.tsx`**: `/produto/:slug`, `/carrinho`. A rota `/p/:slug` é servida pela edge function, não pelo React Router.
- **Arquivos novos**: `src/pages/Loja.tsx`, `src/pages/Produto.tsx`, `src/pages/Carrinho.tsx`, `src/lib/shop.ts` (CRUD + cálculo), `src/lib/cart.ts` (estado localStorage), `supabase/functions/product-og/index.ts`, migration SQL.
- **Arquivos alterados**: `src/App.tsx` (rotas), `src/pages/ServicosGraficos.tsx` (passa a renderizar `Loja`), `src/pages/Admin.tsx` (nova aba), `src/components/Header.tsx` (ícone carrinho), `src/lib/supabase.ts` (tipos).

Mantenho intacto: orçamento de serviços residenciais, afiliados, mídias, painel admin existente.
