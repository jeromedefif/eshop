import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';

// Pomocná funkce pro formátování objemu
function formatVolume(volume: string | number, category: string): string {
  if (category === 'PET') return 'balení'
  if (category === 'Dusík') return volume === 'maly' ? 'malý' : 'velký'
  return `${volume}L`
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
    let additionalMessage: string = '';

    if (status === 'confirmed') {
      subject = `Potvrzení objednávky - VINARIA s.r.o.`;
      statusText = 'POTVRZENA';
      statusColor = '#4CAF50'; // Změněno na zelenou barvu
      additionalMessage = 'Vaše objednávka byla úspěšně potvrzena a připravuje se k expedici.';
    } else if (status === 'cancelled') {
      subject = `Zrušení objednávky - VINARIA s.r.o.`;
      statusText = 'ZRUŠENA';
      statusColor = '#e53935';
      additionalMessage = 'Vaše objednávka byla zrušena. V případě jakýchkoliv dotazů nás neváhejte kontaktovat.';
    } else {
      // Pro jiné stavy neodešleme email
      return NextResponse.json(
        { error: 'Tento stav nevyžaduje odeslání emailu' },
        { status: 400 }
      );
    }

    // Generování HTML emailu
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: ${statusColor};">Vaše objednávka byla ${statusText}</h1>

            <p>Vážený zákazníku ${order.customer_name}, ze společnosti ${order.customer_company || 'Neuvedeno'}</p>
            <p>${additionalMessage}</p>
            <p>Níže najdete shrnutí Vaší objednávky:</p>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Položky objednávky:</h2>
              <ul>
                ${order.order_items.map(item => `
                  <li>
                    ${item.product.name} - ${item.quantity}x ${formatVolume(item.volume, item.product.category)}
                  </li>
                `).join('')}
              </ul>

              <p style="font-weight: bold;">
                Celkový objem: ${order.total_volume}L
              </p>
            </div>

            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2 style="margin-top: 0;">Kontaktní údaje zákazníka:</h2>
              <p>Email: ${order.customer_email}</p>
              <p>Telefon: ${order.customer_phone || 'Neuvedeno'}</p>
              <p>Firma: ${order.customer_company || 'Neuvedeno'}</p>
            </div>

            ${order.note ? `
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h2 style="margin-top: 0;">Poznámka k objednávce:</h2>
                <p>${order.note}</p>
              </div>
            ` : ''}

            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              S pozdravem,<br>
              Váš tým VINARIA s.r.o.
            </p>
          </div>
        </body>
      </html>
    `;

    // Odeslání emailu
    const resend = new Resend(process.env.RESEND_API_KEY);
    const emailResult = await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: order.customer_email,
      bcc: 'fiala@vinaria.cz',
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
