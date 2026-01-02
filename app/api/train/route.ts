import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
// @ts-expect-error - pdf-parse lacks types
import pdf from 'pdf-parse'

export const maxDuration = 300 // 5 minutes timeout for processing

export async function POST(req: Request) {
    console.log('[Train] Request received')
    try {
        const bodyText = await req.text();
        if (!bodyText) {
            console.error('[Train] Empty request body');
            return NextResponse.json({ error: 'Empty request body' }, { status: 400 })
        }

        const { clientId, fileNames } = JSON.parse(bodyText);

        console.log(`[Train] Starting for client: ${clientId}, files:`, fileNames)

        if (!clientId || !fileNames || fileNames.length === 0) {
            return NextResponse.json({ error: 'Missing clientId or fileNames' }, { status: 400 })
        }

        // 1. Verify Authentication (Standard Client)
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            console.error('[Train] Unauthorized access attempt')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Initialize Admin Client (Bypass RLS for processing)
        const adminSupabase = createAdminClient()

        if (!process.env.OPENAI_API_KEY) {
            console.error('[Train] Missing OPENAI_API_KEY')
            return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 })
        }

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        let totalChunks = 0
        const errors: string[] = []

        for (const fileName of fileNames) {
            console.log(`[Train] Processing file: ${fileName}`)

            // 3. Idempotency: Remove existing chunks for this file
            const { error: deleteError } = await adminSupabase
                .from('rag_documents')
                .delete()
                .match({ client_id: clientId })
                .filter('metadata->>filename', 'eq', fileName)

            if (deleteError) {
                console.error(`[Train] Error clearing old chunks for ${fileName}:`, deleteError)
            }

            // 4. Download file (Use Admin Client to ensure access)
            console.log(`[Train] Downloading ${fileName}...`)
            const { data: fileData, error: downloadError } = await adminSupabase
                .storage
                .from('knowledge_base')
                .download(`${clientId}/${fileName}`)

            if (downloadError || !fileData) {
                const msg = `Error downloading ${fileName}: ${downloadError?.message}`
                console.error(`[Train] ${msg}`)
                errors.push(msg)
                continue
            }

            // 4. Extract Text
            const buffer = Buffer.from(await fileData.arrayBuffer())
            let text = ''

            try {
                if (fileName.toLowerCase().endsWith('.pdf')) {
                    console.log(`[Train] Parsing PDF: ${fileName}`)
                    const pdfData = await pdf(buffer)
                    text = pdfData.text
                } else {
                    console.log(`[Train] Parsing Text: ${fileName}`)
                    text = buffer.toString('utf-8')
                }
            } catch (e) {
                const msg = `Error parsing ${fileName}: ${e instanceof Error ? e.message : String(e)}`
                console.error(`[Train] ${msg}`)
                errors.push(msg)
                continue
            }

            // Clean text
            text = text.replace(/\s+/g, ' ').trim()

            if (!text) {
                console.warn(`[Train] File ${fileName} is empty after cleanup`)
                errors.push(`File ${fileName} is empty after cleanup`)
                continue
            }

            // 5. Chunk Text
            console.log(`[Train] Chunking ${fileName}...`)
            const chunks = chunkText(text, 1000, 200)
            console.log(`[Train] Generated ${chunks.length} chunks for ${fileName}`)

            // 6. Generate Embeddings & Save
            console.log(`[Train] Generating embeddings and saving...`)
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
                        console.error('[Train] Error inserting chunk:', insertError)
                        errors.push(`Insert failed for chunk in ${fileName}: ${insertError.message}`)
                    } else {
                        totalChunks++
                    }
                } catch (e) {
                    console.error('[Train] Embedding/Insert error:', e)
                    const errMsg = e instanceof Error ? e.message : String(e)
                    errors.push(`Processing failed for chunk in ${fileName}: ${errMsg}`)
                }
            }
        }

        console.log(`[Train] Completed. Total chunks: ${totalChunks}, Errors: ${errors.length}`)

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

    } catch (error) {
        console.error('[Train] Fatal Error:', error)
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errMsg }, { status: 500 })
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

        // Fix for infinite loop: Ensure we always move forward.
        // If overlap effectively pushes us back to or before startIndex, ignore overlap.
        const nextStep = endIndex - overlap;
        startIndex = Math.max(startIndex + 1, nextStep);
    }

    return chunks
}
