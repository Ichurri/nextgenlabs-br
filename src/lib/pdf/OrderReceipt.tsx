import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { formatDiscountDetail } from "@/lib/discounts";
import type { ReceiptData } from "@/lib/orders-data";

// Si alguna vez agregás un test que llame a renderOrderReceiptPdf(), no lo
// corras bajo el `environment: "jsdom"` de vitest.config.ts: el stream
// FlateDecode de las imágenes sale corrupto ahí (confirmado con pypdf/poppler
// — Node 20 y 24 producen un PDF válido corriendo el script directo, pero
// vitest+jsdom corrompe el mismo render). Usá `// @vitest-environment node`
// en ese archivo, o probá contra la Route Handler real.
const ACCENT = "#3b82f6";
const INK = "#111113";
const MUTED = "#6b7280";
const BORDER = "#e5e7eb";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: INK,
    backgroundColor: "#ffffff",
  },
  headerBand: {
    backgroundColor: ACCENT,
    paddingHorizontal: 32,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: { height: 22 },
  headerTitle: {
    color: "#ffffff",
    fontFamily: "Inter",
    fontWeight: 700,
    fontSize: 14,
    textAlign: "right",
  },
  content: { paddingHorizontal: 32, paddingTop: 24, paddingBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    paddingBottom: 14,
    marginBottom: 14,
  },
  label: { color: MUTED, fontSize: 9 },
  value: { fontSize: 11, marginTop: 2 },
  bold: { fontFamily: "Inter", fontWeight: 700 },
  table: { borderWidth: 1, borderColor: BORDER, borderRadius: 4 },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  colProduct: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colUnit: { flex: 1.4, textAlign: "right" },
  colTotal: { flex: 1.4, textAlign: "right" },
  tableHeaderText: { color: MUTED, fontSize: 8, fontFamily: "Inter", fontWeight: 700 },
  totalsBlock: {
    marginTop: 20,
    alignSelf: "flex-end",
    width: 260,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 6,
    padding: 14,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 6,
  },
  // Detalle del código de descuento ("MAFE10 · 10% de descuento"): va como
  // subtítulo bajo "Descuento", nunca al lado del monto — un código largo
  // pegado a "−Bsxx" en la misma línea quedaba encimado (ver git blame).
  totalsRowDetail: { fontSize: 8, color: MUTED, marginTop: 1 },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  grandTotalLabel: { fontSize: 12, fontFamily: "Inter", fontWeight: 700 },
  grandTotalValue: { fontSize: 16, fontFamily: "Inter", fontWeight: 700, color: ACCENT },
  footer: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: BORDER,
  },
  footerText: { fontSize: 8, color: MUTED, lineHeight: 1.5 },
});

const STATUS_LABEL: Record<ReceiptData["status"], string> = {
  paid: "Pago",
};

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}

async function readImageBuffers() {
  const logo = await readFile(join(process.cwd(), "public/logo-pdf.png"));
  return { logo };
}

function OrderReceiptDocument({
  order,
  logoData,
}: {
  order: ReceiptData;
  logoData: Buffer;
}) {
  const discountDetail = formatDiscountDetail(order.discountCode, order.discountCodeLabel);

  return (
    <Document title={`Pedido ${order.orderNumber}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de @react-pdf/renderer, no <img>: no tiene prop alt */}
          <Image src={{ data: logoData, format: "png" }} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>{siteConfig.name.toUpperCase()}</Text>
            <Text style={styles.headerTitle}>COMPROVANTE DE PEDIDO</Text>
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.row, styles.section]}>
            <View>
              <Text style={styles.label}>Pedido</Text>
              <Text style={[styles.value, styles.bold]}>{order.orderNumber}</Text>
            </View>
            <View>
              <Text style={styles.label}>Data</Text>
              <Text style={styles.value}>{formatOrderDate(order.createdAt)}</Text>
            </View>
            <View>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{STATUS_LABEL[order.status]}</Text>
            </View>
          </View>

          <View style={[styles.row, styles.section]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cliente</Text>
              <Text style={styles.value}>{order.customerName}</Text>
              <Text style={[styles.label, { marginTop: 6 }]}>WhatsApp</Text>
              <Text style={styles.value}>{order.customerPhone}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Cidade</Text>
              <Text style={styles.value}>{order.customerCity}</Text>
              {order.customerAddress && (
                <>
                  <Text style={[styles.label, { marginTop: 6 }]}>Endereço</Text>
                  <Text style={styles.value}>{order.customerAddress}</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colProduct, styles.tableHeaderText]}>PRODUCTO</Text>
              <Text style={[styles.colQty, styles.tableHeaderText]}>QTD.</Text>
              <Text style={[styles.colUnit, styles.tableHeaderText]}>PREÇO UNIT.</Text>
              <Text style={[styles.colTotal, styles.tableHeaderText]}>TOTAL</Text>
            </View>
            {order.items.map((item) => (
              <View key={item.slug} style={styles.tableRow}>
                <Text style={styles.colProduct}>
                  {item.name} {item.dose}
                </Text>
                <Text style={styles.colQty}>{item.quantity}</Text>
                <Text style={styles.colUnit}>{formatPrice(item.unitPrice)}</Text>
                <Text style={styles.colTotal}>{formatPrice(item.lineTotal)}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalsBlock}>
            <View style={[styles.totalsRow, { marginTop: 0 }]}>
              <Text style={styles.label}>Subtotal</Text>
              <Text style={styles.value}>{formatPrice(order.subtotal)}</Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.totalsRow}>
                <View>
                  <Text style={styles.label}>Desconto</Text>
                  {discountDetail && (
                    <Text style={styles.totalsRowDetail}>{discountDetail}</Text>
                  )}
                </View>
                <Text style={styles.value}>−{formatPrice(order.discount)}</Text>
              </View>
            )}
            <View style={styles.totalsRow}>
              <Text style={styles.label}>Frete</Text>
              <Text style={styles.value}>{formatPrice(order.shipping)}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL</Text>
              <Text style={styles.grandTotalValue}>{formatPrice(order.total)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento comprova o pedido e não substitui nota fiscal.
          </Text>
          <Text style={styles.footerText}>
            Produtos destinados exclusivamente à pesquisa. Não destinados ao consumo humano.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Renderiza el comprobante de un pedido a un Buffer PDF. Registra las
 * fuentes Inter (regular + bold) leyendo los .ttf locales, mismo patrón que
 * `renderBrandOgImage()` en brand-og-image.tsx — sin esto los acentos y la
 * ñ salen rotos.
 */
export async function renderOrderReceiptPdf(order: ReceiptData): Promise<Buffer> {
  const { logo } = await readImageBuffers();

  // Font.register acepta un path local (fontkit.open) además de URL/data-uri;
  // a diferencia de next/og (satori), acá no hace falta leer el buffer.
  Font.register({
    family: "Inter",
    fonts: [
      { src: join(process.cwd(), "src/assets/fonts/Inter-Regular.ttf"), fontWeight: 400 },
      { src: join(process.cwd(), "src/assets/fonts/Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });

  return renderToBuffer(<OrderReceiptDocument order={order} logoData={logo} />);
}
