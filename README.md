# Nextgen Labs

Tienda virtual de péptidos **para uso exclusivo de investigación**, distribuidor
oficial de [Onyx Research](https://onyxresearch.shop) en Bolivia.

No hay pasarela de pago: los pedidos se cierran por **WhatsApp** con un mensaje
pre-cargado que incluye el detalle del carrito.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Zustand** para el carrito, persistido en `localStorage`
- Sin backend, sin base de datos, sin login. Los productos viven en un archivo local.

## Cómo correr el proyecto

```bash
npm install
npm run dev      # entorno de desarrollo en http://localhost:3000
npm run build    # build de producción
npm start        # servir el build de producción
```

---

## ✅ Qué reemplazar antes de publicar

Todos los valores a editar están marcados en el código con `// TODO:` o
`PLACEHOLDER`. Los principales:

### 1. Número de WhatsApp — `src/config/site.ts`
```ts
export const WHATSAPP_NUMBER = "59178184211"; // ← número real, solo dígitos, con código de país
```
Formato internacional sin `+`, espacios ni guiones. Ejemplo Bolivia: `59171234567`.

### 2. Datos de contacto y redes — `src/config/site.ts`
- `contact.email` — correo real
- `contact.city` — ciudad / dirección
- `contact.whatsappDisplay` — número visible en la página de contacto
- `social.*` — enlaces a redes (deja `""` para ocultar)
- `url` — dominio final del sitio (para SEO / Open Graph)

### 3. Productos y precios — `src/data/products.ts`
La lista actual es **placeholder** (mismos compuestos que onyxresearch.shop, con
precios de ejemplo). Reemplaza con los productos y **precios reales en Bs**.

### 4. Imágenes de producto — `public/products/`
Actualmente hay **viales SVG generados como placeholder**. Reemplázalos por fotos
reales usando **el mismo nombre de archivo** (o cambia la ruta en el campo `image`).

### 5. Certificados de Análisis (COA)
En cada producto, el campo opcional `coaUrl` apunta al PDF del lote. Mientras esté
`undefined`, la ficha muestra "COA disponible bajo solicitud".

### 6. Textos legales
`src/app/terminos/page.tsx` y `src/app/privacidad/page.tsx` contienen texto de
referencia. **Valídalos con un asesor legal** antes de publicar.

---

## Cómo agregar o editar productos

Edita el array `products` en [`src/data/products.ts`](src/data/products.ts):

```ts
{
  slug: "mi-producto-10mg",   // único, minúsculas con guiones -> URL /producto/mi-producto-10mg
  name: "Mi Producto",
  dose: "10 MG",
  price: 350,                  // en Bs. Usa 0 para mostrar "Precio a consultar"
  purity: "≥99% HPLC",
  form: "Liofilizado",
  category: "Péptidos",        // "Péptidos" | "Blends" | "SARMs" | "Otros"
  image: "/products/mi-producto.webp",
  highlights: [                // viñetas de beneficios
    "Primer beneficio…",
    "Segundo beneficio…",
  ],
  description: "Párrafo opcional en español…", // opcional
  coaUrl: "https://…/coa.pdf", // opcional
  featured: true,              // opcional: aparece en el home
},
```

- **Precio a consultar**: si pones `price: 0`, la tarjeta y la ficha muestran
  "Precio a consultar" con un botón para pedir el precio por WhatsApp.
- **Categorías**: para agregar una nueva, edita el tipo `ProductCategory` y el
  array `categories` en el mismo archivo.
- **Imágenes**: coloca el archivo (`.webp`, `.jpg` o `.png`) en `public/products/`
  y referencia la ruta (sin `public`) en `image`. Las imágenes cuadradas (1:1) se
  ven mejor en las tarjetas.

---

## Assets en `/public`

- `logo.svg` — logo de Nextgen Labs (header, footer, hero, age gate)
- `hero-loop.mp4` — video del hero en loop

## Estructura

```
src/
  app/                 # rutas (App Router)
    catalogo/          # /catalogo
    producto/[slug]/   # detalle de producto
    carrito/           # /carrito
    contacto/  preguntas-frecuentes/  terminos/  privacidad/
  components/          # Header, Footer, ProductCard, CartDrawer, AgeGate, WhatsAppButton, Hero…
  config/site.ts       # configuración editable (WhatsApp, contacto, redes)
  data/products.ts     # catálogo de productos
  lib/                 # carrito (Zustand), formato de precios, mensaje de WhatsApp
```

## Aviso legal

Productos exclusivamente para uso de investigación. No aptos para consumo humano
ni uso diagnóstico o terapéutico.
