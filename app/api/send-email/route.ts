// app/api/send-email/route.ts - upravená verze pro UUID
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { PrismaClient } from '@prisma/client';

// Vytvořit novou instanci Prisma klienta
const prisma = new PrismaClient();

// Pomocná funkce pro formátování objemu
function formatVolume(volume: string | number, category: string): string {
  if (category === 'PET') return 'balení'
  if (category === 'Dusík') return volume === 'maly' ? 'malý' : 'velký'
  return `${volume}L`
}

export async function POST(request: Request) {
  console.log('RESEND_API_KEY available:', !!process.env.RESEND_API_KEY);

  try {
    // Parse request body
    let orderId;
    try {
      const body = await request.json();
      orderId = body.orderId;
      console.log('Processing email for order:', orderId);
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Inicializace Resend
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
      // Načtení objednávky s jejími položkami a produkty
      // Pro UUID použijeme přímo string bez konverze na BigInt
      const order = await prisma.order.findUnique({
        where: { id: orderId },  // Bez konverze na BigInt
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

      console.log('Order loaded:', {
        id: order.id,
        customer: order.customer_email,
        items: order.order_items.length
      });

      // Generování HTML emailu - zůstává stejné
      const emailHtml = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #1a73e8;">Potvrzení objednávky pro ${order.customer_name}</h1>

              <p>Vážený zákazníku ${order.customer_name}, ze společnosti ${order.customer_company || 'Neuvedeno'}</p>
              <p>děkujeme za Vaši objednávku. Níže najdete její shrnutí:</p>

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

      console.log('Sending email to:', order.customer_email);

      // Odeslání emailu přes Resend
      const data = await resend.emails.send({
        from: process.env.FROM_EMAIL || 'objednavky@beginy.cz',
        to: order.customer_email,
        bcc: 'fiala@vinaria.cz', // Skrytá kopie vždy půjde na tento email
        subject: `Potvrzení objednávky pro ${order.customer_name}, z emailu: ${order.customer_email}`,
        html: emailHtml
      });

      console.log('Email sent:', data);

      // Aktualizace statusu objednávky - také bez konverze na BigInt
      await prisma.order.update({
        where: { id: orderId },  // Bez konverze na BigInt
        data: { status: 'confirmed' }
      });

      return NextResponse.json({ success: true, data });
    } catch (prismaError) {
      console.error('Database or email error:', prismaError);
      return NextResponse.json(
        { error: 'Database or email error', details: prismaError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Server error', details: error.message },
      { status: 500 }
    );
  }
}
