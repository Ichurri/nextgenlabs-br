/**
 * Datos de pago (QR estático + transferencia bancaria).
 * PLACEHOLDER: todos estos datos los da el cliente antes de publicar. Son
 * públicos por naturaleza (es la cuenta que recibe el dinero).
 */
export const PAYMENT = {
  qrImage: "/pago/qr.png",
  bank: "Banco XXX",
  accountHolder: "Nombre del titular",
  accountNumber: "0000000000",
  accountType: "Caja de ahorro",
  currency: "BOB",
} as const;
