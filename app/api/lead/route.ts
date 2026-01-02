import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const body = await request.json()
    const { clientId, ...formData } = body

    if (!clientId) {
        return NextResponse.json({ error: 'Missing client ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify Client exists and is active
    const { data: clientData, error: clientError } = await supabase
        .from('widget_configs')
        .select('is_active, bot_name, ghl_inbound_webhook') // Fetch GHL Webhook
        .eq('client_id', clientId)
        .single()

    if (clientError || !clientData?.is_active) {
        return NextResponse.json({ error: 'Chat widget is disabled' }, { status: 403 })
    }

    // 2. Forward to n8n
    const N8N_LEAD_WEBHOOK_URL = process.env.N8N_LEAD_WEBHOOK_URL;

    if (!N8N_LEAD_WEBHOOK_URL) {
        // Fallback mock response if no n8n configured
        console.warn('N8N_LEAD_WEBHOOK_URL not configured')
        return NextResponse.json({
            success: true,
            message: 'Lead received (Mock mode)'
        })
    }

    // 3. Forward to GoHighLevel (if configured)
    if (clientData?.ghl_inbound_webhook) {
        try {
            // Fire and forget (don't block response on GHL)
            fetch(clientData.ghl_inbound_webhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    tags: ["chat-widget-lead"],
                    source: "TRM Chat Widget"
                })
            }).catch(err => console.error('GHL Forward Error:', err));
        } catch (e) {
            console.error('GHL Sync Error', e);
        }
    }

    try {
        const n8nResponse = await fetch(N8N_LEAD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.N8N_API_KEY || ''
            },
            body: JSON.stringify({
                type: 'lead',
                clientId,
                clientName: clientData.bot_name,
                submittedAt: new Date().toISOString(),
                ...formData
            })
        });

        if (!n8nResponse.ok) {
            throw new Error('Failed to reach Lead Processing Agent');
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Lead API Error:', error);
        return NextResponse.json({ error: 'Lead service unavailable' }, { status: 500 });
    }
}
