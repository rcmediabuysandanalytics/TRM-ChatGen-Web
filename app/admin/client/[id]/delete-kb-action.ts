'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function deleteKbEmbeddings(clientId: string, fileName: string) {
    if (!clientId || !fileName) return { error: 'Missing parameters' }

    const supabase = createAdminClient()

    try {
        console.log(`[Delete KB] Deleting embeddings for Client: ${clientId}, File: ${fileName}`)

        // 1. Precise Match
        const { error, count } = await supabase
            .from('rag_documents')
            .delete({ count: 'exact' })
            .eq('client_id', clientId)
            .filter('metadata->>filename', 'eq', fileName)

        if (error) {
            console.error('[Delete KB] Delete error:', error)
            throw error
        }

        console.log(`[Delete KB] Deleted ${count} rows (Precision Match)`)

        // 2. Fallback: URL encoded match (in case one side is %20 and other is space)
        if (count === 0 && fileName.includes(' ')) {
            // Maybe it was saved encoded?
            const encodedName = encodeURIComponent(fileName)
            const { count: countEncoded } = await supabase
                .from('rag_documents')
                .delete({ count: 'exact' })
                .eq('client_id', clientId)
                .filter('metadata->>filename', 'eq', encodedName)

            if (countEncoded && countEncoded > 0) {
                console.log(`[Delete KB] Deleted ${countEncoded} rows (Encoded Match: ${encodedName})`)
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Error deleting embeddings:', error)
        return { error: error instanceof Error ? error.message : 'Unknown error' }
    }
}
