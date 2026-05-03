// Generic PIX BR Code (copia-e-cola) generator for any key type.
function tlv(id: string, value: string): string {
  return id + value.length.toString().padStart(2, "0") + value;
}

function sanitize(s: string, max: number): string {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .slice(0, max)
    .trim() || "PIX";
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) !== 0 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface PixBrCodeOptions {
  key: string;
  amount?: number;
  merchantName: string;
  merchantCity?: string;
  txid?: string;
}

export function buildPixBrCode({
  key,
  amount,
  merchantName,
  merchantCity = "BRASIL",
  txid = "***",
}: PixBrCodeOptions): string {
  const gui = tlv("00", "br.gov.bcb.pix");
  const keyTlv = tlv("01", key);
  const merchantAccountInfo = tlv("26", gui + keyTlv);
  const partial =
    tlv("00", "01") +
    merchantAccountInfo +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amount && amount > 0 ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", sanitize(merchantName, 25)) +
    tlv("60", sanitize(merchantCity, 15)) +
    tlv("62", tlv("05", sanitize(txid, 25))) +
    "6304";
  return partial + crc16(partial);
}