import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
// @ts-ignore
import pdf from 'pdf-parse'

export const maxDuration = 300 // 5 minutes timeout for processing

export async function POST(req: Request) {
    try {
        const { clientId, fileNames } = await req.json()

        if (!clientId || !fileNames || fileNames.length === 0) {
            return NextResponse.json({ error: 'Missing clientId or fileNames' }, { status: 400 })
        }

        // 1. Verify Authentication (Standard Client)
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Initialize Admin Client (Bypass RLS for processing)
        const adminSupabase = createAdminClient()
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        let totalChunks = 0
        let errors: string[] = []

        for (const fileName of fileNames) {
            console.log(`Processing file: ${fileName} for client: ${clientId}`)

            // 3. Idempotency: Remove existing chunks for this file to prevent duplicates
            const { error: deleteError } = await adminSupabase
                .from('rag_documents')
                .delete()
                .match({ client_id: clientId })
                .filter('metadata->>filename', 'eq', fileName)

            if (deleteError) {
                console.error(`Error clearing old chunks for ${fileName}:`, deleteError)
                // We typically continue, but logging is important. 
                // Failure to delete might mean duplicates if we proceed, but stopping might be too harsh.
                // For now, we continue but could push to errors if strict.
            }

            // 4. Download file (Use Admin Client to ensure access)
            const { data: fileData, error: downloadError } = await adminSupabase

                .storage
                .from('knowledge_base')
                .download(`${clientId}/${fileName}`)

            if (downloadError || !fileData) {
                const msg = `Error downloading ${fileName}: ${downloadError?.message}`
                console.error(msg)
                errors.push(msg)
                continue
            }

            // 4. Extract Text
            const buffer = Buffer.from(await fileData.arrayBuffer())
            let text = ''

            try {
                if (fileName.toLowerCase().endsWith('.pdf')) {
                    const pdfData = await pdf(buffer)
                    text = pdfData.text
                } else {
                    text = buffer.toString('utf-8')
                }
            } catch (e: any) {
                const msg = `Error parsing ${fileName}: ${e.message}`
                console.error(msg)
                errors.push(msg)
                continue
            }

            // Clean text
            text = text.replace(/\s+/g, ' ').trim()

            if (!text) {
                errors.push(`File ${fileName} is empty after cleanup`)
                continue
            }

            // 5. Chunk Text
            const chunks = chunkText(text, 1000, 200)
            console.log(`Generated ${chunks.length} chunks for ${fileName}`)

            // 6. Generate Embeddings & Save
            for (const chunk of chunks) {
                try {
                    const embeddingResponse = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: chunk,
                    })

                    const embedding = embeddingResponse.data[0].embedding

                    // 7. Insert into DB (Admin Client bypasses RLS)
                    const { error: insertError } = await adminSupabase
                        .from('rag_documents')
                        .insert({
                            content: chunk,
                            embedding: embedding,
                            client_id: clientId,
                            metadata: {
                                client_id: clientId,
                                filename: fileName,
                                source: 'admin-upload'
                            }
                        })

                    if (insertError) {
                        console.error('Error inserting chunk:', insertError)
                        errors.push(`Insert failed for chunk in ${fileName}: ${insertError.message}`)
                    } else {
                        totalChunks++
                    }
                } catch (e: any) {
                    console.error('Embedding/Insert error:', e)
                    errors.push(`Processing failed for chunk in ${fileName}: ${e.message}`)
                }
            }
        }

        if (totalChunks === 0 && errors.length > 0) {
            return NextResponse.json({
                success: false,
                error: 'Processing failed',
                details: errors
            }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            chunksProcessed: totalChunks,
            errors: errors.length > 0 ? errors : undefined
        })

    } catch (error: any) {
        console.error('Training Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

// Simple recursive text splitter function
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = []
    let startIndex = 0

    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize

        if (endIndex < text.length) {
            // Try to find the last period or newline to break cleanly
            const nextPeriod = text.lastIndexOf('.', endIndex)
            const nextNewline = text.lastIndexOf('\n', endIndex)
            const breakPoint = Math.max(nextPeriod, nextNewline)

            if (breakPoint > startIndex) {
                endIndex = breakPoint + 1
            }
        }

        const chunk = text.slice(startIndex, endIndex).trim()
        if (chunk.length > 0) {
            chunks.push(chunk)
        }

        startIndex = endIndex - overlap
    }

    return chunks
}
