'use server'

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function deleteClient(clientId: string) {
    // 1. Verify Authentication (Standard Client)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { error: "Unauthorized" }
    }

    // 2. Initialize Admin Client for Cleanup (Bypasses RLS)
    const adminSupabase = createAdminClient()

    try {
        console.log(`Starting deletion for client: ${clientId}`)

        // 3. Cleanup RAG Data (Table)
        // Explicitly delete all knowledge base embeddings
        const { error: ragError } = await adminSupabase
            .from('rag_documents')
            .delete()
            .eq('client_id', clientId)

        if (ragError) {
            console.error("RAG Delete Error:", ragError)
            // We log but continue to try and delete the rest
        } else {
            console.log("RAG documents deleted")
        }

        // 4. Cleanup Storage: Knowledge Base
        // Listing files in the 'knowledge_base' bucket for this client
        const { data: kbFiles } = await adminSupabase.storage
            .from('knowledge_base')
            .list(clientId)

        if (kbFiles && kbFiles.length > 0) {
            const kbPaths = kbFiles.map(f => `${clientId}/${f.name}`)
            const { error: kbStorageError } = await adminSupabase.storage
                .from('knowledge_base')
                .remove(kbPaths)

            if (kbStorageError) console.error("KB Storage Delete Error:", kbStorageError)
            else console.log(`Deleted ${kbFiles.length} KB files`)
        }

        // 5. Cleanup Storage: Brand Assets (Logo)
        const { data: brandFiles } = await adminSupabase.storage
            .from('brand_assets')
            .list(clientId)

        if (brandFiles && brandFiles.length > 0) {
            const brandPaths = brandFiles.map(f => `${clientId}/${f.name}`)
            const { error: brandStorageError } = await adminSupabase.storage
                .from('brand_assets')
                .remove(brandPaths)

            if (brandStorageError) console.error("Brand Storage Delete Error:", brandStorageError)
            else console.log(`Deleted ${brandFiles.length} brand asset files`)
        }

        // 6. Delete Client from DB (Cascading)
        // Using admin client ensures we don't hit strict RLS on the client table itself if there are policies
        const { error } = await adminSupabase
            .from('clients')
            .delete()
            .eq('id', clientId)

        if (error) {
            console.error("DB Delete Error:", error)
            return { error: `Failed to delete from database: ${error.message}` }
        }

        revalidatePath('/admin')
        return { success: true }
    } catch (err) {
        console.error("Delete Client Exception:", err)
        return { error: "Unexpected server error occurred" }
    }
}
