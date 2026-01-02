import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
// @ts-expect-error - pdf-parse lacks types
import pdf from 'pdf-parse'

export const maxDuration = 300 // 5 minutes timeout (if plan allows)

export async function POST(req: Request) {
    console.log('[Train] Request received')
    try {
        const bodyText = await req.text();
        if (!bodyText) return NextResponse.json({ error: 'Empty request body' }, { status: 400 })

        const { clientId, fileNames } = JSON.parse(bodyText);
        console.log(`[Train] Starting for client: ${clientId}, files:`, fileNames)

        if (!clientId || !fileNames || fileNames.length === 0) {
            return NextResponse.json({ error: 'Missing clientId or fileNames' }, { status: 400 })
        }

        // Verify Auth
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            console.error('[Train] Unauthorized')
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Initialize Admin Client
        const adminSupabase = createAdminClient()
        if (!process.env.OPENAI_API_KEY) {
            console.error('[Train] Missing OPENAI_API_KEY')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

        let totalChunks = 0
        const errors: string[] = []

        for (const fileName of fileNames) {
            console.log(`[Train] Processing file: ${fileName}`)

            // 1. Idempotency: Clear old chunks
            const { error: deleteError } = await adminSupabase
                .from('rag_documents')
                .delete()
                .match({ client_id: clientId })
                .filter('metadata->>filename', 'eq', fileName)

            if (deleteError) console.error(`[Train] Error clearing old chunks for ${fileName}`, deleteError)

            // 2. Download
            const { data: fileData, error: downloadError } = await adminSupabase
                .storage
                .from('knowledge_base')
                .download(`${clientId}/${fileName}`)

            if (downloadError || !fileData) {
                const msg = `Download failed for ${fileName}: ${downloadError?.message}`
                console.error(`[Train] ${msg}`)
                errors.push(msg)
                continue
            }

            // 3. Extract Text
            const buffer = Buffer.from(await fileData.arrayBuffer())
            let text = ''
            try {
                if (fileName.toLowerCase().endsWith('.pdf')) {
                    const pdfData = await pdf(buffer)
                    text = pdfData.text
                } else {
                    text = buffer.toString('utf-8')
                }
            } catch (e) {
                const msg = `Parsing failed for ${fileName}: ${e instanceof Error ? e.message : String(e)}`
                console.error(`[Train] ${msg}`)
                errors.push(msg)
                continue
            }

            text = text.replace(/\s+/g, ' ').trim()
            if (!text) {
                errors.push(`File ${fileName} is empty`)
                continue
            }

            // 4. Chunk
            const chunks = chunkText(text, 1000, 200)
            console.log(`[Train] Generated ${chunks.length} chunks for ${fileName}`)

            // 5. Batch Embeddings & Insert
            // OpenAI allows batching inputs. Let's do batches of 20 to be safe and fast.
            const BATCH_SIZE = 20;
            for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
                const batchChunks = chunks.slice(i, i + BATCH_SIZE);
                try {
                    // Generate embeddings for the batch
                    const embeddingResponse = await openai.embeddings.create({
                        model: 'text-embedding-3-small',
                        input: batchChunks, // Pass array of strings
                    })

                    // Prepare DB rows
                    const rowsToInsert = batchChunks.map((chunkContent, idx) => ({
                        content: chunkContent,
                        embedding: embeddingResponse.data[idx].embedding,
                        client_id: clientId,
                        metadata: {
                            client_id: clientId,
                            filename: fileName,
                            source: 'admin-upload'
                        }
                    }));

                    // Batch Insert
                    const { error: insertError } = await adminSupabase
                        .from('rag_documents')
                        .insert(rowsToInsert)

                    if (insertError) {
                        console.error('[Train] Batch insert error:', insertError)
                        errors.push(`Batch insert failed for ${fileName}: ${insertError.message}`)
                    } else {
                        totalChunks += batchChunks.length
                    }
                } catch (e) {
                    console.error('[Train] Batch processing error:', e)
                    const errMsg = e instanceof Error ? e.message : String(e)
                    errors.push(`Batch processing failed for ${fileName}: ${errMsg}`)
                }
            }
        }

        console.log(`[Train] Completed. Total chunks: ${totalChunks}, Errors: ${errors.length}`)

        if (totalChunks === 0 && errors.length > 0) {
            return NextResponse.json({ success: false, error: 'Processing failed', details: errors }, { status: 500 })
        }

        return NextResponse.json({ success: true, chunksProcessed: totalChunks, errors: errors.length > 0 ? errors : undefined })

    } catch (error) {
        console.error('[Train] Fatal Error:', error)
        const errMsg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: errMsg }, { status: 500 })
    }
}

function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = []
    let startIndex = 0
    while (startIndex < text.length) {
        let endIndex = startIndex + chunkSize
        if (endIndex < text.length) {
            const nextPeriod = text.lastIndexOf('.', endIndex)
            const nextNewline = text.lastIndexOf('\n', endIndex)
            const breakPoint = Math.max(nextPeriod, nextNewline)
            if (breakPoint > startIndex) endIndex = breakPoint + 1
        }
        const chunk = text.slice(startIndex, endIndex).trim()
        if (chunk.length > 0) chunks.push(chunk)
        const nextStep = endIndex - overlap;
        startIndex = Math.max(startIndex + 1, nextStep);
    }
    return chunks
}
