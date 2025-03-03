import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import prisma from '@/lib/prisma';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    // Inicializace Supabase klienta pro autentizaci
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookies().get(name)?.value;
          },
          set() {}, // Není potřeba pro čtení session
          remove() {} // Není potřeba pro čtení session
        }
      }
    );

    // Kontrola session
    const { data: { session } } = await supabase.auth.getSession();

    // Parse request body
    const body = await request.json();
    const orderId = body.orderId;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    // Načtení objednávky s kontrolou vlastníka
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        ...(session && { user_id: session.user.id }) // Přidá podmínku jen pokud je uživatel přihlášený
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
      console.error('Order not found or unauthorized:', orderId);
      return NextResponse.json(
        { error: 'Objednávka nenalezena' },
        { status: 404 }
      );
    }

    // Generování HTML emailu
    const emailHtml = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a73e8;">Objednávka přijata - čeká na potvrzení</h1>

            <p style="font-weight: bold;"><strong>Vážený zákazníku ${order.customer_name}, ze společnosti ${order.customer_company || 'Neuvedeno'}</strong></p>
            <p>děkujeme za Vaši objednávku. Vaše objednávka byla přijata do systému a čeká na potvrzení naším pracovníkem.</p>
            <p>O potvrzení objednávky Vás budeme informovat emailem.</p>
            <p>Níže najdete její shrnutí:</p>

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
      subject: `Nová objednávka: ${order.customer_name} (${order.customer_company || 'Bez firmy'})`,
      html: emailHtml
    });

    // Důležitá změna: Již neměníme status objednávky
    // Odebráno: await prisma.order.update({
    //   where: { id: orderId },
    //   data: { status: 'confirmed' }
    // });

    return NextResponse.json({
      success: true,
      emailResult,
      orderId: order.id
    });

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
