'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface KbFileStatus {
    name: string;
    updated_at: string;
    status: 'TRAINED' | 'NOT TRAINED';
}

export async function getKbFilesWithStatus(clientId: string): Promise<KbFileStatus[]> {
    const supabase = createAdminClient()

    // 1. List files from Storage
    const { data: files, error: storageError } = await supabase
        .storage
        .from('knowledge_base')
        .list(`${clientId}/`)

    if (storageError || !files) {
        throw new Error('Failed to list files: ' + storageError?.message)
    }

    // 2. Get latest embedding timestamps for this client
    // We group by filename (metadata->>filename) and get the max created_at
    const { data: docs, error: dbError } = await supabase
        .from('rag_documents')
        .select('created_at, metadata')
        .eq('client_id', clientId)

    if (dbError) {
        throw new Error('Failed to fetch document status: ' + dbError.message)
    }

    // Map filename -> max_created_at
    const trainedMap = new Map<string, number>()

    docs?.forEach(doc => {
        const filename = (doc.metadata as any)?.filename
        if (filename) {
            const time = new Date(doc.created_at).getTime()
            const currentMax = trainedMap.get(filename) || 0
            if (time > currentMax) {
                trainedMap.set(filename, time)
            }
        }
    })

    // 3. Compare and build result
    return files.map(f => {
        const fileTime = new Date(f.updated_at).getTime()
        const trainedTime = trainedMap.get(f.name) || 0

        // If trainedTime is 0, it's never been trained.
        // If fileTime > trainedTime, it has been updated since last training.
        // We add a small buffer (e.g. 1 second) to avoid race conditions where they are virtually same time
        const isTrained = trainedTime > 0 && trainedTime >= (fileTime - 1000)

        return {
            name: f.name,
            updated_at: f.updated_at,
            status: isTrained ? 'TRAINED' : 'NOT TRAINED'
        }
    })
}
