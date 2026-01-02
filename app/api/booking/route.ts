import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const body = await request.json()
    const { clientId, sessionId } = body

    if (!clientId) {
        return NextResponse.json({ error: 'Missing client ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Verify Client exists and is active
    const { data: clientData, error: clientError } = await supabase
        .from('widget_configs')
        .select('is_active, bot_name')
        .eq('client_id', clientId)
        .single()

    if (clientError || !clientData?.is_active) {
        return NextResponse.json({ error: 'Chat widget is disabled' }, { status: 403 })
    }

    // 2. Forward to n8n (Using Lead Webhook for Booking Intents)
    const N8N_LEAD_WEBHOOK_URL = process.env.N8N_LEAD_WEBHOOK_URL;

    if (!N8N_LEAD_WEBHOOK_URL) {
        console.warn('N8N_LEAD_WEBHOOK_URL not configured')
        return NextResponse.json({ success: true, message: 'Booking intent logged (Mock)' })
    }

    try {
        await fetch(N8N_LEAD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.N8N_API_KEY || ''
            },
            body: JSON.stringify({
                type: 'booking',
                clientId,
                sessionId,
                clientName: clientData.bot_name,
                timestamp: new Date().toISOString()
            })
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Booking API Error:', error);
        return NextResponse.json({ error: 'Booking service unavailable' }, { status: 500 });
    }
}
