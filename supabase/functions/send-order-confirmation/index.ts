import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend'

const corsHeaders = {
 'Access-Control-Allow-Origin': '*',
 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatVolume(volume: string | number, category: string): string {
 if (category === 'PET') return 'balení'
 if (category === 'Dusík') return volume === 'maly' ? 'malý' : 'velký'
 return `${volume}L`
}

Deno.serve(async (req) => {
 if (req.method === 'OPTIONS') {
   return new Response('ok', { headers: corsHeaders });
 }

 try {
   // Debug log pro environment proměnné
   console.log('Environment check:', {
     hasResendKey: Boolean(Deno.env.get('RESEND_API_KEY')),
     hasProjectUrl: Boolean(Deno.env.get('PROJECT_URL')),
     hasServiceKey: Boolean(Deno.env.get('SERVICE_KEY'))
   });

   const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
   const supabase = createClient(
     Deno.env.get('PROJECT_URL')!,
     Deno.env.get('SERVICE_KEY')!
   );

   const { orderId } = await req.json();
if (!orderId) {
    throw new Error('No orderId provided');
}

console.log('Received orderId:', orderId);

   const { data: order, error: orderError } = await supabase
     .from('orders')
     .select(`
       *,
       order_items (
         id,
         products (
           name,
           category
         ),
         volume,
         quantity
       )
     `)
     .eq('id', orderId)
     .single();

   if (orderError) {
     console.error('Order fetch error:', orderError);
     throw new Error(`Chyba při načítání objednávky: ${orderError.message}`);
   }

   console.log('Order data:', {
     id: order.id,
     email: order.customer_email,
     items: order.order_items.length
   });

   const emailHtml = `
     <html>
       <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
         <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
           <h1 style="color: #1a73e8;">Potvrzení objednávky #${order.id}</h1>

           <p>Vážený zákazníku ${order.customer_name},</p>
           <p>děkujeme za Vaši objednávku. Níže najdete její shrnutí:</p>

           <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
             <h2 style="margin-top: 0;">Položky objednávky:</h2>
             <ul>
               ${order.order_items.map(item => `
                 <li>
                   ${item.products.name} - ${item.quantity}x ${formatVolume(item.volume, item.products.category)}
                 </li>
               `).join('')}
             </ul>

             <p style="font-weight: bold;">
               Celkový objem: ${order.total_volume}L
             </p>
           </div>

           <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
             <h2 style="margin-top: 0;">Kontaktní údaje:</h2>
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
             Váš tým Vinařství
           </p>
         </div>
       </body>
     </html>
   `;

   console.log('Attempting to send email to:', order.customer_email);

   const result = await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: order.customer_email,  // email zákazníka
    bcc: 'fiala@vinaria.cz',  // skrytá kopie pro vás
    subject: `Potvrzení objednávky #${order.id}`,
    html: emailHtml
});

   console.log('Email send result:', result);

   const { error: updateError } = await supabase
     .from('orders')
     .update({
       status: 'confirmed',
       updated_at: new Date().toISOString()
     })
     .eq('id', order.id);

   if (updateError) {
     console.error('Status update error:', updateError);
   }

   return new Response(
     JSON.stringify({ success: true, emailSent: result }),
     { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );

 } catch (error) {
   console.error('Detailed error:', {
     message: error.message,
     name: error.name,
     stack: error.stack,
     cause: error.cause
   });

   return new Response(
     JSON.stringify({
       error: 'Failed to process order confirmation',
       details: error.message,
       stack: error.stack
     }),
     {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' }
     }
   );
 }
});
