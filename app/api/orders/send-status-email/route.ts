import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

type OrderItemWithProduct = {
  quantity: number;
  volume: string | number;
  product: {
    name: string;
    category: string;
  };
};

function formatVolume(volume: string | number, category: string): string {
  if (category === 'PET') return 'balení';
  if (category === 'Dusík' || category === 'Plyny') return volume === 'maly' ? 'malý' : 'velký';
  return `${volume}L`;
}

function normalizeCategory(category: string): string {
  if (category === 'Dusík' || category === 'Plyny') return 'Plyny';
  return category;
}

function categoryRank(category: string): number {
  const order = ['Nápoje', 'Víno', 'Ovocné víno', 'Plyny', 'PET'];
  const idx = order.indexOf(category);
  return idx === -1 ? 999 : idx;
}

function getVolumeSortValue(volume: string | number): number {
  const normalized = String(volume || '').toLowerCase().trim();
  const numberMatch = normalized.match(/(\d+(?:[.,]\d+)?)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1].replace(',', '.'));
  }
  if (normalized.includes('velk')) return 2;
  if (normalized.includes('mal')) return 1;
  if (normalized.includes('balen')) return 0;
  return -1;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sortOrderItems(items: OrderItemWithProduct[]): OrderItemWithProduct[] {
  return [...items].sort((a, b) => {
    const categoryA = normalizeCategory(a?.product?.category || 'Ostatní');
    const categoryB = normalizeCategory(b?.product?.category || 'Ostatní');

    const byCategory = categoryRank(categoryA) - categoryRank(categoryB);
    if (byCategory !== 0) return byCategory;

    const byVolume = getVolumeSortValue(b.volume) - getVolumeSortValue(a.volume);
    if (byVolume !== 0) return byVolume;

    const byQuantity = Number(b.quantity || 0) - Number(a.quantity || 0);
    if (byQuantity !== 0) return byQuantity;

    return String(a?.product?.name || '').localeCompare(String(b?.product?.name || ''), 'cs');
  });
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

export async function POST(request: Request) {
  try {
    // Kontrola konfigurace
    if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
      console.error('Missing configuration:', {
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasFromEmail: !!process.env.FROM_EMAIL
      });
      return NextResponse.json(
        { error: 'Email service not configured properly' },
        { status: 500 }
      );
    }

    // Zpracování požadavku
    const body = await request.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing orderId or status' },
        { status: 400 }
      );
    }

    // Načtení objednávky s položkami
    const order = await prisma.order.findUnique({
      where: {
        id: orderId
      },
      include: {
        order_items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      console.error('Order not found:', orderId);
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      );
    }

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
      return NextResponse.json(
        { error: 'Tento stav nevyžaduje odeslání emailu' },
        { status: 400 }
      );
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

    // Odeslání emailu
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailResult = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: order.customer_email,
      subject: subject,
      html: emailHtml
    });

    return NextResponse.json({
      success: true,
      emailResult,
      orderId: order.id
    });

  } catch (error: any) {
    console.error('Error in send-status-email route:', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: 'Server error',
        details: error.message,
        code: error.code
      },
      { status: 500 }
    );
  }
}
