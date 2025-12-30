import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const { message, clientId, sessionId } = await request.json()

    if (!clientId || !message) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

    // 2. Log User Message to Supabase
    // Ensure session exists (here we assume the client passed a session ID, or we create one)
    // For MVP, we just log the message if sessionId is valid, or create a new session

    // Note: "n8n for AI Agent". 
    // We will forward this to n8n.
    // The n8n webhook URL should probably be in the database or an env var.
    // For this generic SaaS, maybe each client has their own webhook, or one central one?
    // User said "n8n for the AI Agent replies", implying one system.
    // We'll use an Env var for the N8N Webhook URL for now.

    const N8N_WEBHOOK_URL = process.env.N8N_CHAT_WEBHOOK_URL;

    if (!N8N_WEBHOOK_URL) {
        // Fallback mock response if no n8n configured
        return NextResponse.json({
            reply: `[Mock] Echo: ${message}. (Configure N8N_CHAT_WEBHOOK_URL to connect AI)`
        })
    }

    try {
        const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                clientId,
                sessionId,
                message,
                clientName: clientData.bot_name // Context for AI
            })
        });

        if (!n8nResponse.ok) {
            throw new Error('Failed to reach AI agent');
        }

        const data = await n8nResponse.json();
        // Expecting { reply: "..." } from n8n
        return NextResponse.json(data);

    } catch (error) {
        console.error('AI Error:', error);
        return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 });
    }
}
