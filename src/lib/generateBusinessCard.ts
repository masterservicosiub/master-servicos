import jsPDF from "jspdf";
import QRCode from "qrcode";
import templateUrl from "@/assets/cartao-template.png";

// Card physical size: 8.5cm x 4.5cm (front only)
const CARD_W_CM = 8.5;
const CARD_H_CM = 4.5;

// Coordinates (in % of the template image) of the white "QR CODE" box
// and the "LINK" box. Calibrated from the supplied template.
// Template aspect ratio ≈ 1050x583 (the uploaded mockup).
const QR_BOX = { xPct: 0.205, yPct: 0.46, wPct: 0.21, hPct: 0.42 };
const LINK_BOX = { xPct: 0.10, yPct: 0.83, wPct: 0.42, hPct: 0.13 };

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, baseSize: number): number {
  let size = baseSize;
  ctx.font = `bold ${size}px Arial, sans-serif`;
  while (ctx.measureText(text).width > maxWidth && size > 8) {
    size -= 1;
    ctx.font = `bold ${size}px Arial, sans-serif`;
  }
  return size;
}

/**
 * Renders the front of the business card to a canvas and returns it.
 * Output canvas is at 300 DPI to keep print quality (1004 x 531 px).
 */
export async function renderBusinessCardCanvas(referralLink: string): Promise<HTMLCanvasElement> {
  const DPI = 300;
  const cmToPx = (cm: number) => Math.round((cm / 2.54) * DPI);
  const W = cmToPx(CARD_W_CM); // 1004
  const H = cmToPx(CARD_H_CM); // 531

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas não suportado.");

  // 1) draw template stretched to card area
  const template = await loadImage(templateUrl);
  ctx.drawImage(template, 0, 0, W, H);

  // 2) generate QR code at high resolution
  const qrSize = Math.round(QR_BOX.wPct * W);
  const qrDataUrl = await QRCode.toDataURL(referralLink, {
    margin: 1,
    width: qrSize * 2,
    color: { dark: "#0a2a5c", light: "#ffffff" },
    errorCorrectionLevel: "M",
  });
  const qrImg = await loadImage(qrDataUrl);

  const qrX = QR_BOX.xPct * W;
  const qrY = QR_BOX.yPct * H;
  const qrW = QR_BOX.wPct * W;
  const qrH = QR_BOX.hPct * H;
  // keep QR square: fit inside box
  const side = Math.min(qrW, qrH);
  const cx = qrX + qrW / 2;
  const cy = qrY + qrH / 2;
  // white background to clear placeholder text
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qrX, qrY, qrW, qrH);
  ctx.drawImage(qrImg, cx - side / 2, cy - side / 2, side, side);

  // 3) write the link in the LINK box
  const linkX = LINK_BOX.xPct * W;
  const linkY = LINK_BOX.yPct * H;
  const linkW = LINK_BOX.wPct * W;
  const linkH = LINK_BOX.hPct * H;

  // clean the box
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(linkX, linkY, linkW, linkH);
  // border (matches template style)
  ctx.strokeStyle = "#0a2a5c";
  ctx.lineWidth = Math.max(2, Math.round(H * 0.006));
  ctx.strokeRect(linkX, linkY, linkW, linkH);

  // strip protocol for display
  const display = referralLink.replace(/^https?:\/\//i, "");
  ctx.fillStyle = "#0a2a5c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontSize = fitText(ctx, display, linkW * 0.9, Math.round(linkH * 0.55));
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillText(display, linkX + linkW / 2, linkY + linkH / 2);

  return canvas;
}

export async function downloadBusinessCardJPG(referralLink: string, filename = "cartao-afiliado.jpg") {
  const canvas = await renderBusinessCardCanvas(referralLink);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export async function downloadBusinessCardPDF(referralLink: string, filename = "cartao-afiliado.pdf") {
  const canvas = await renderBusinessCardCanvas(referralLink);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
  // PDF page exactly the card size
  const pdf = new jsPDF({
    unit: "cm",
    format: [CARD_W_CM, CARD_H_CM],
    orientation: "landscape",
  });
  pdf.addImage(dataUrl, "JPEG", 0, 0, CARD_W_CM, CARD_H_CM);
  pdf.save(filename);
}