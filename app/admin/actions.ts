'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function addClient(formData: FormData) {
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const name = formData.get('name') as string

    if (!name) {
        return { error: 'Name is required' }
    }

    // 1. Create Client
    const { data: client, error: clientError } = await supabase
        .from('clients')
        .insert({ name })
        .select()
        .single()

    if (clientError) {
        return { error: clientError.message }
    }

    // 2. Create Default Widget Config
    const { error: configError } = await supabase
        .from('widget_configs')
        .insert({
            client_id: client.id,
            bot_name: name + ' Assistant',
            welcome_message: 'Hi there! How can I help you?',
            primary_color: '#0F172A', // Slate 900
        })

    if (configError) {
        return { error: 'Client created but config failed: ' + configError.message }
    }

    revalidatePath('/admin')
    return { success: true, clientId: client.id }
}
