# Manual RAG Upload Guide

The automated RAG upload feature has been removed from the Admin Dashboard. You can now manage your Knowledge Base manually using **n8n** and **Google Drive**.

## Workflow Overview

1.  **Upload to Google Drive**: Place your documents (PDF, Docx, Txt) into a designated Google Drive folder.
2.  **Trigger n8n Workflow**: Your n8n workflow monitors this folder or is triggered manually.
3.  **Process & Embed**: n8n processes the files, generates embeddings (using OpenAI), and inserts them into the `rag_documents` table in Supabase.

## Database Schema Reference

When setting up your n8n workflow, ensure you insert data into the `rag_documents` table with the following structure:

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `bigint` | Primary Key (Auto-generated) |
| `content` | `text` | The text chunk content |
| `embedding` | `vector(1536)` | The OpenAI embedding vector |
| `metadata` | `jsonb` | Metadata including filename, page numbers, etc. |
| `client_id` | `uuid` | The Client ID this document belongs to |

### Example Insert Payload (n8n Supabase Node)

```json
{
  "content": "{{ $json.text_chunk }}",
  "embedding": "{{ $json.embedding_vector }}",
  "client_id": "YOUR_CLIENT_ID",
  "metadata": {
    "filename": "{{ $json.file_name }}",
    "source": "google-drive-n8n"
  }
}
```

## Tips for n8n

*   **PDF Parsing**: Use the "Read Binary File" node followed by a PDF parser (or use an API like ConvertAPI or unstructured.io).
*   **Chunking**: Ensure you split the text into chunks of around 500-1000 tokens before embedding to ensure better retrieval accuracy.
*   **Embeddings**: Use the "OpenAI" node with the `text-embedding-3-small` model.
*   **Clean Up**: If you update a file, make sure your workflow first *deletes* old chunks for that filename/client_id to avoid duplicate content.
    *   *Delete Query*: `DELETE FROM rag_documents WHERE client_id = '...' AND metadata->>'filename' = '...'`
