import type { Prisma } from '@prisma/client';
import { normalizeOrderCategory, sortOrderItems } from '@/lib/order-item-sorting';
import { withOrderSnapshots } from '@/lib/orders/snapshots';
export type EmailOrder = Prisma.OrderGetPayload<{ include: { order_items: { include: { product: true } } } }>;
export type EmailMessage = { dedupe_key: string; recipient: string; subject: string; html: string };
type OrderItemWithProduct = {
  quantity: number;
  volume: string | number;
  product: {
    name: string;
    category: string;
  };
};

// Helper functions
function formatVolume(volume: string | number, category: string): string {
  if (category === 'PET') return 'balení';
  if (category === 'Dusík' || category === 'Plyny') return volume === 'maly' ? 'malý' : 'velký';
  return `${volume}L`;
}

function normalizeCategory(category: string): string {
  return normalizeOrderCategory(category);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildItemsTable(items: OrderItemWithProduct[]): string {
  const rows = items.map((item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;">
        <div style="color:#111827;font-weight:600;line-height:1.35;">${escapeHtml(item.product.name)}</div>
        <div style="margin-top:4px;color:#4b5563;line-height:1.35;">${escapeHtml(normalizeCategory(item.product.category))}, ${escapeHtml(item.quantity)}x ${escapeHtml(formatVolume(item.volume, item.product.category))}</div>
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px;text-align:left;color:#334155;font-size:12px;text-transform:uppercase;">Položky objednávky</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function receiptMessages(source: EmailOrder): EmailMessage[] {
 const order = withOrderSnapshots(source);
      const sortedItems = sortOrderItems(order.order_items as OrderItemWithProduct[]);
      const itemsTable = buildItemsTable(sortedItems);
      const orderNumber = order.id.slice(0, 8).toUpperCase();
      const createdDate = new Date(order.created_at).toLocaleDateString('cs-CZ');
      const noteHtml = order.note
        ? `<p style="margin:6px 0 0;color:#111827;">${escapeHtml(order.note)}</p>`
        : `<p style="margin:6px 0 0;color:#6b7280;">Neuvedena</p>`;

      // Customer email
      const customerEmailHtml = `
        <html>
          <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
          <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
            <div style="max-width:680px;margin:0 auto;padding:20px 14px;">
              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:22px;">
                <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">VINARIA s.r.o. - Beginy.cz</p>
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#1d4ed8;">Objednávka přijata – čeká na potvrzení</h1>
                <p style="margin:0 0 10px;color:#374151;">Vážený zákazníku ${escapeHtml(order.customer_name)}, děkujeme za Vaši objednávku. O jejím potvrzení Vás budeme informovat e-mailem.</p>

                <div style="margin-top:18px;padding:14px;border:1px solid #dbeafe;background:#eff6ff;border-radius:10px;">
                  <p style="margin:0;color:#1e3a8a;"><strong>Číslo objednávky:</strong> ${orderNumber}</p>
                  <p style="margin:6px 0 0;color:#1e3a8a;"><strong>Datum:</strong> ${createdDate}</p>
                  <p style="margin:6px 0 0;color:#1e3a8a;"><strong>Stav:</strong> Čeká na potvrzení</p>
                  <p style="margin:6px 0 0;color:#1e3a8a;"><strong>Celkový objem:</strong> ${escapeHtml(order.total_volume)} L</p>
                </div>

                <h2 style="margin:24px 0 10px;font-size:18px;color:#111827;">Položky objednávky</h2>
                ${itemsTable}

                <h2 style="margin:24px 0 8px;font-size:18px;color:#111827;">Poznámka k objednávce</h2>
                <div style="padding:14px;border:1px solid #e5e7eb;background:#f9fafb;border-radius:10px;">
                  ${noteHtml}
                </div>

                <p style="margin:26px 0 0;padding-top:14px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
                  V případě dotazů nás kontaktujte emailem na:
                  <a href="mailto:fiala@vinaria.cz" style="color:#1d4ed8;"> fiala@vinaria.cz</a>
                  nebo telefonicky na:
                  <a href="tel:+420734720994" style="color:#1d4ed8;"> +420 734 720 994</a>.<br/>
                  VINARIA s.r.o. - Beginy.cz
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      // Admin email
      const adminEmailHtml = `
        <html>
          <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
          <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
            <div style="max-width:680px;margin:0 auto;padding:20px 14px;">
              <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:22px;">
                <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">VINARIA s.r.o. - Beginy.cz</p>
                <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#1d4ed8;">Nová objednávka k vyřízení</h1>
                <div style="margin-top:12px;padding:14px;border:1px solid #fee2e2;background:#fef2f2;border-radius:10px;">
                  <p style="margin:0;color:#7f1d1d;"><strong>Číslo objednávky:</strong> ${orderNumber}</p>
                  <p style="margin:6px 0 0;color:#7f1d1d;"><strong>Datum:</strong> ${createdDate}</p>
                  <p style="margin:6px 0 0;color:#7f1d1d;"><strong>Zákazník:</strong> ${escapeHtml(order.customer_name)}</p>
                  <p style="margin:6px 0 0;color:#7f1d1d;"><strong>Firma:</strong> ${escapeHtml(order.customer_company || 'Neuvedeno')}</p>
                  <p style="margin:6px 0 0;color:#7f1d1d;"><strong>E-mail:</strong> <a href="mailto:${escapeHtml(order.customer_email)}" style="color:#b91c1c;">${escapeHtml(order.customer_email)}</a></p>
                  <p style="margin:6px 0 0;color:#7f1d1d;"><strong>Telefon:</strong> ${escapeHtml(order.customer_phone || 'Neuvedeno')}</p>
                  <p style="margin:6px 0 0;color:#7f1d1d;"><strong>Celkový objem:</strong> ${escapeHtml(order.total_volume)} L</p>
                </div>

                <h2 style="margin:24px 0 10px;font-size:18px;color:#111827;">Položky objednávky</h2>
                ${itemsTable}

                <h2 style="margin:24px 0 8px;font-size:18px;color:#111827;">Poznámka k objednávce</h2>
                <div style="padding:14px;border:1px solid #e5e7eb;background:#f9fafb;border-radius:10px;">
                  ${noteHtml}
                </div>

                <p style="margin:26px 0 0;padding-top:14px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
                  V případě dotazů nás kontaktujte emailem na:
                  <a href="mailto:fiala@vinaria.cz" style="color:#1d4ed8;"> fiala@vinaria.cz</a>
                  nebo telefonicky na:
                  <a href="tel:+420734720994" style="color:#1d4ed8;"> +420 734 720 994</a>.<br/>
                  VINARIA s.r.o. - Beginy.cz
                </p>
              </div>
            </div>
          </body>
        </html>
      `;


 return [
 { dedupe_key: `${order.id}:receipt:customer`, recipient: order.customer_email, subject: `Objednávka přijata #${orderNumber} – VINARIA s.r.o.`, html: customerEmailHtml },
 { dedupe_key: `${order.id}:receipt:admin`, recipient: process.env.ADMIN_NOTIFICATION_EMAIL || 'fiala@vinaria.cz', subject: `Nová objednávka: ${order.customer_name} #${orderNumber}`, html: adminEmailHtml }
 ];
}
export function statusMessage(source: EmailOrder): EmailMessage {
 const order = withOrderSnapshots(source);
 const status = order.status;
    // Určení předmětu a úvodního textu emailu podle stavu
    let subject: string;
    let statusText: string;
    let statusColor: string;
    let statusBg: string;
    let additionalMessage: string = '';

    if (status === 'confirmed') {
      subject = `Objednávka vyřízena: ${order.customer_name} (${order.customer_company || 'Bez firmy'}) #${order.id.slice(0, 8).toUpperCase()}`;
      statusText = 'VYŘÍZENA';
      statusColor = '#166534';
      statusBg = '#dcfce7';
      additionalMessage = 'Vaše objednávka byla úspěšně potvrzena a připravuje se k expedici.';
    } else if (status === 'cancelled') {
      subject = `Objednávka zrušena: ${order.customer_name} (${order.customer_company || 'Bez firmy'}) #${order.id.slice(0, 8).toUpperCase()}`;
      statusText = 'ZRUŠENA';
      statusColor = '#991b1b';
      statusBg = '#fee2e2';
      additionalMessage = 'Vaše objednávka byla zrušena. V případě jakýchkoliv dotazů nás neváhejte kontaktovat.';
    } else {
      // Pro jiné stavy neodešleme email
      throw new Error('Nepodporovaný stav oznámení');
    }

    const sortedItems = sortOrderItems(order.order_items as OrderItemWithProduct[]);
    const itemsTable = buildItemsTable(sortedItems);
    const orderNumber = order.id.slice(0, 8).toUpperCase();
    const createdDate = new Date(order.created_at).toLocaleDateString('cs-CZ');
    const noteHtml = order.note
      ? `<p style="margin:6px 0 0;color:#111827;">${escapeHtml(order.note)}</p>`
      : `<p style="margin:6px 0 0;color:#6b7280;">Neuvedena</p>`;

    // Generování HTML emailu
    const emailHtml = `
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
        <body style="margin:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
          <div style="max-width:680px;margin:0 auto;padding:20px 14px;">
            <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:22px;">
              <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">VINARIA s.r.o. - Beginy.cz</p>
              <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:${statusColor};">Objednávka ${statusText.toLowerCase()}</h1>

              <p style="margin:0 0 10px;color:#374151;">Vážený zákazníku ${escapeHtml(order.customer_name)},</p>
              <p style="margin:0 0 12px;color:#374151;">${escapeHtml(additionalMessage)}</p>

              <div style="margin-top:16px;padding:14px;border:1px solid ${statusBg};background:${statusBg};border-radius:10px;">
                <p style="margin:0;color:${statusColor};"><strong>Číslo objednávky:</strong> ${orderNumber}</p>
                <p style="margin:6px 0 0;color:${statusColor};"><strong>Datum vytvoření:</strong> ${createdDate}</p>
                <p style="margin:6px 0 0;color:${statusColor};"><strong>Stav:</strong> ${statusText}</p>
                <p style="margin:6px 0 0;color:${statusColor};"><strong>Celkový objem:</strong> ${escapeHtml(order.total_volume)} L</p>
              </div>

              <h2 style="margin:24px 0 10px;font-size:18px;color:#111827;">Položky objednávky</h2>
              ${itemsTable}

              <h2 style="margin:24px 0 8px;font-size:18px;color:#111827;">Poznámka k objednávce</h2>
              <div style="padding:14px;border:1px solid #e5e7eb;background:#f9fafb;border-radius:10px;">
                ${noteHtml}
              </div>

              <p style="margin:26px 0 0;padding-top:14px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:13px;">
                V případě dotazů nás kontaktujte emailem na:
                <a href="mailto:fiala@vinaria.cz" style="color:#1d4ed8;"> fiala@vinaria.cz</a>
                nebo telefonicky na:
                <a href="tel:+420734720994" style="color:#1d4ed8;"> +420 734 720 994</a>.<br/>
                VINARIA s.r.o. - Beginy.cz
              </p>
            </div>
          </div>
        </body>
      </html>
    `;


 return { dedupe_key: `${order.id}:status:${status}:${order.updated_at.toISOString()}`, recipient: order.customer_email, subject, html: emailHtml };
}
