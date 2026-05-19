import puppeteer from "puppeteer-core";

interface PdfItem {
  linea_numero: number;
  descripcion: string;
  descripcion_larga?: string;
  precio_unitario: number;
  cantidad: number;
  descuento_pct: number;
  subtotal: number;
}

interface PdfCliente {
  nombre: string;
  rut?: string;
  contacto?: string;
  telefono?: string;
  direccion?: string;
}

interface PdfCotizacion {
  numero: string;
  forma_pago: string;
  validez_dias: number;
  notas_cliente?: string;
  subtotal_neto: number;
  iva: number;
  total_con_iva: number;
  emitida_en: string;
  items: PdfItem[];
}

function money(n: number): string {
  if (!n) return "—";
  return "$" + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function buildHtml(cot: PdfCotizacion, cliente: PdfCliente): string {
  const fecha = new Date(cot.emitida_en).toLocaleDateString("es-CL", {
    day: "numeric", month: "long", year: "numeric",
  });

  const rowsHtml = cot.items
    .map((it, i) => {
      const disc = it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : "";
      return `
        <tr>
          <td>${i + 1}</td>
          <td>${it.descripcion}${disc}</td>
          <td>${it.cantidad}</td>
          <td>${money(it.precio_unitario)}</td>
          <td><strong>${money(it.subtotal)}</strong></td>
        </tr>
        ${it.descripcion_larga
          ? `<tr><td></td><td colspan="4" class="desc-larga">${it.descripcion_larga.replace(/\n/g, "<br/>")}</td></tr>`
          : ""}`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cotización ${cot.numero}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; color: #1e293b; padding: 36px 40px; }
    header { display: flex; justify-content: space-between; align-items: flex-start;
             margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #0f172a; }
    header img { height: 40px; }
    .header-right { text-align: right; }
    .header-right .numero { display: block; font-size: 20px; font-weight: 700; color: #0f172a; }
    h3 { margin: 18px 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .08em;
         color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
    .client-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 16px; }
    .client-grid dt { color: #64748b; font-size: 12px; }
    .client-grid dd { font-size: 13px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #0f172a; color: #fff; padding: 9px 12px; text-align: left; font-size: 12px; }
    td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    .desc-larga { color: #64748b; font-size: 12px; white-space: pre-line; padding: 4px 12px 12px;
                  break-inside: avoid; page-break-inside: avoid; }
    .totals { width: 320px; margin-left: auto; margin-bottom: 16px; }
    .totals td { padding: 5px 12px; }
    .totals tr:last-child td { font-weight: 700; font-size: 15px; border-top: 2px solid #0f172a; }
    .conditions { font-size: 12px; color: #475569; background: #f8fafc; padding: 12px;
                  border-radius: 6px; margin-bottom: 16px; }
    .conditions strong { display: block; margin-bottom: 4px; }
    .notas { font-size: 12px; color: #475569; margin-bottom: 12px; font-style: italic; }
    footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0;
             text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <header>
    <div>
      <img src="https://biomeditech.cl/wp-content/uploads/2021/07/logo_w.png" alt="Biomeditech" style="filter:brightness(0)"/>
      <p style="margin-top:4px;color:#64748b;font-size:12px">Reparación y mantención de equipos médicos</p>
    </div>
    <div class="header-right">
      <span class="numero">${cot.numero}</span>
      <span>${fecha}</span><br/>
      <span style="color:#64748b">biomeditech.cl</span>
    </div>
  </header>

  <h3>Datos del cliente</h3>
  <dl class="client-grid">
    <dt>Empresa</dt><dd>${cliente.nombre}</dd>
    <dt>RUT</dt><dd>${cliente.rut ?? "—"}</dd>
    <dt>Contacto</dt><dd>${cliente.contacto ?? "—"}</dd>
    <dt>Teléfono</dt><dd>${cliente.telefono ?? "—"}</dd>
    <dt>Dirección</dt><dd>${cliente.direccion ?? "—"}</dd>
  </dl>

  <h3>Detalle del servicio</h3>
  <table>
    <thead>
      <tr><th>#</th><th>Descripción</th><th>Cant.</th><th>P. Unitario</th><th>Subtotal</th></tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>

  <table class="totals">
    <tr><td>Neto</td><td>${money(cot.subtotal_neto)} CLP</td></tr>
    <tr><td>IVA (19%)</td><td>${money(cot.iva)} CLP</td></tr>
    <tr><td>Total</td><td>${money(cot.total_con_iva)} CLP</td></tr>
  </table>

  <div class="conditions">
    <strong>Condiciones</strong>
    Forma de pago: ${cot.forma_pago} · Validez: ${cot.validez_dias} días · Diagnóstico incluido en servicio aceptado
  </div>

  ${cot.notas_cliente ? `<p class="notas">${cot.notas_cliente}</p>` : ""}

  <footer>contacto@biomeditech.cl · biomeditech.cl · Válida por ${cot.validez_dias} días desde emisión</footer>
</body>
</html>`;
}

let _browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

async function getBrowser() {
  if (_browser && _browser.connected) return _browser;
  _browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium-browser",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
    ],
  });
  return _browser;
}

export async function generatePdf(cot: PdfCotizacion, cliente: PdfCliente): Promise<Buffer> {
  const html = buildHtml(cot, cliente);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });
    const buffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}
