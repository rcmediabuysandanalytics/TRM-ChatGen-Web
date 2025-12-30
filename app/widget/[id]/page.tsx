import { createClient } from '@/lib/supabase/server'
import { ChatWidget } from '@/components/chat-widget'
import { notFound } from 'next/navigation'

// This page accepts the client ID and renders ONLY the widget.
// It is meant to be loaded inside an iframe.
export default async function WidgetPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: config } = await supabase
        .from('widget_configs')
        .select('*')
        .eq('client_id', id)
        .single()

    if (!config) return notFound()

    return (
        <div className="h-full w-full bg-transparent">
            <ChatWidget
                theme={config.theme}
                botName={config.bot_name}
                welcomeMessage={config.welcome_message}
                clientId={id}
                logoUrl={config.logo_url}
            />
        </div>
    )
}
