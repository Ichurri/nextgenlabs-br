/**
 * Datos de pago (QR estático + transferencia bancaria).
 * PLACEHOLDER: todos estos datos los da el cliente antes de publicar. Son
 * públicos por naturaleza (es la cuenta que recibe el dinero).
 */
export const PAYMENT = {
  qrImage: "/pago/qr.jpeg",
  bank: "Banco Economico",
  accountHolder: "Castro Farrapo Ana Leticia",
  accountNumber: "3101659906",
  accountType: "Caja de ahorro",
  currency: "BOB",
} as const;
