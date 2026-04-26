// Generate a static PIX "BR Code" (EMV / copia-e-cola) for a CPF key.
// Reference: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf
import { onlyDigits } from "./cpfValidator";

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
      else crc = crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(s: string, max: number): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, max)
    .trim() || "PIX";
}

export interface PixOptions {
  cpf: string;            // PIX key (CPF, only digits)
  amount?: number;        // optional value in BRL
  merchantName: string;   // up to 25 chars
  merchantCity?: string;  // up to 15 chars
  txid?: string;          // up to 25 chars
}

export function buildPixCpfPayload({ cpf, amount, merchantName, merchantCity = "BRASIL", txid = "***" }: PixOptions): string {
  const key = onlyDigits(cpf);
  if (key.length !== 11) throw new Error("CPF inválido para chave Pix.");

  const gui = tlv("00", "BR.GOV.BCB.PIX");
  const keyTlv = tlv("01", key);
  const merchantAccountInfo = tlv("26", gui + keyTlv);

  const payloadFormat = tlv("00", "01");
  const merchantCategoryCode = tlv("52", "0000");
  const transactionCurrency = tlv("53", "986"); // BRL
  const transactionAmount = amount && amount > 0 ? tlv("54", amount.toFixed(2)) : "";
  const countryCode = tlv("58", "BR");
  const name = tlv("59", sanitize(merchantName, 25));
  const city = tlv("60", sanitize(merchantCity, 15));
  const addData = tlv("62", tlv("05", sanitize(txid, 25)));

  const partial =
    payloadFormat +
    merchantAccountInfo +
    merchantCategoryCode +
    transactionCurrency +
    transactionAmount +
    countryCode +
    name +
    city +
    addData +
    "6304";

  const crc = crc16(partial);
  return partial + crc;
}