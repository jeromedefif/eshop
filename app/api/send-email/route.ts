// app/api/send-email/route.ts
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

// Helper functions
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
  const desktopRows = items.map((item) => `
    <tr>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(item.product.name)}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#374151;">${escapeHtml(normalizeCategory(item.product.category))}</td>
      <td style="padding:10px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:left;white-space:nowrap;">${escapeHtml(item.quantity)}x ${escapeHtml(formatVolume(item.volume, item.product.category))}</td>
    </tr>
  `).join('');

  const mobileRows = items.map((item) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;">
        <div style="color:#111827;font-weight:600;line-height:1.35;">${escapeHtml(item.product.name)}</div>
        <div style="margin-top:4px;color:#4b5563;line-height:1.35;">${escapeHtml(normalizeCategory(item.product.category))}, ${escapeHtml(item.quantity)}x ${escapeHtml(formatVolume(item.volume, item.product.category))}</div>
      </td>
    </tr>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" class="desktop-items" style="width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#f8fafc;">
          <th style="padding:10px;text-align:left;color:#334155;font-size:12px;text-transform:uppercase;">Produkt</th>
          <th style="padding:10px;text-align:left;color:#334155;font-size:12px;text-transform:uppercase;">Kategorie</th>
          <th style="padding:10px;text-align:left;color:#334155;font-size:12px;text-transform:uppercase;">KS x Objem</th>
        </tr>
      </thead>
      <tbody>
        ${desktopRows}
      </tbody>
    </table>
    <table role="presentation" cellspacing="0" cellpadding="0" class="mobile-items" style="display:none;width:100%;border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
      <tbody>
        ${mobileRows}
      </tbody>
    </table>
  `;
}

export async function POST(request: Request) {
  try {
    // Check if environment variables are properly set
    if (!process.env.RESEND_API_KEY || !process.env.FROM_EMAIL) {
      console.error('Missing required environment variables for email sending:', {
        hasResendKey: !!process.env.RESEND_API_KEY,
        hasFromEmail: !!process.env.FROM_EMAIL
      });
      return NextResponse.json(
        { error: 'Email service not configured properly' },
        { status: 500 }
      );
    }

    // Parse request body
    const body = await request.json();
    const orderId = body.orderId;

    if (!orderId) {
      console.error('Missing orderId in request');
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    console.log(`Processing email request for order ID: ${orderId}`);

    // Load order without owner check - we trust the server-side API
    // This simplifies the logic and removes dependency on authentication state
    try {
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
        console.error(`Order not found: ${orderId}`);
        return NextResponse.json(
          { error: 'Objednávka nenalezena' },
          { status: 404 }
        );
      }

      console.log(`Order found, generating email templates for ${order.customer_email}`);

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
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @media only screen and (max-width: 600px) {
                .desktop-items { display: none !important; }
                .mobile-items { display: table !important; }
              }
            </style>
          </head>
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
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @media only screen and (max-width: 600px) {
                .desktop-items { display: none !important; }
                .mobile-items { display: table !important; }
              }
            </style>
          </head>
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

      // Send email using Resend
      console.log('Initializing Resend with API key');
      const resend = new Resend(process.env.RESEND_API_KEY);

      console.log(`Sending customer email to: ${order.customer_email}`);
      const customerEmailResult = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: order.customer_email,
        subject: `Objednávka přijata #${orderNumber} – VINARIA s.r.o.`,
        html: customerEmailHtml
      });

      console.log('Sending admin email to: fiala@vinaria.cz');
      const adminEmailResult = await resend.emails.send({
        from: process.env.FROM_EMAIL,
        to: 'fiala@vinaria.cz',
        subject: `Nová objednávka: ${order.customer_name} (${order.customer_company || 'Bez firmy'}) #${orderNumber}`,
        html: adminEmailHtml
      });

      console.log('Email sending completed');

      return NextResponse.json({
        success: true,
        customerEmailResult,
        adminEmailResult,
        orderId: order.id
      });
    } catch (prismaError) {
      console.error('Database error when fetching order:', prismaError);
      return NextResponse.json(
        { error: 'Database error', details: prismaError instanceof Error ? prismaError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in send-email route:', {
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
