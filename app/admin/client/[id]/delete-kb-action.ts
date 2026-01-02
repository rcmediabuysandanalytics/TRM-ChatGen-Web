'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteKbEmbeddings(clientId: string, fileName: string) {
    if (!clientId || !fileName) return { error: 'Missing parameters' }

    const supabase = createAdminClient()

    try {
        const { error } = await supabase
            .from('rag_documents')
            .delete()
            .match({ client_id: clientId })
            .filter('metadata->>filename', 'eq', fileName)

        if (error) throw error
        return { success: true }
    } catch (error) {
        console.error('Error deleting embeddings:', error)
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
