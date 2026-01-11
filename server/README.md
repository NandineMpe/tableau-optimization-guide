# Tableau RAG System with Gemini File API

This is a proper RAG (Retrieval-Augmented Generation) implementation using Google's Gemini File API to provide accurate answers based on the official Tableau Desktop manual.

## How It Works

1. **Upload Once**: The Tableau PDF is uploaded to Gemini's cloud storage (one-time operation)
2. **Query Anytime**: The server uses the uploaded file as context for all questions
3. **Accurate Answers**: Gemini searches through the 3800-page manual to provide precise answers

## Setup Instructions

### Step 1: Upload the Tableau PDF (One-Time)

Run this command **locally** (not on Render) to upload the PDF to Gemini:

```bash
cd server
npm run upload-pdf
```

This will:
- Download the Tableau Desktop PDF
- Upload it to Gemini File API
- Wait for processing to complete
- Display the file URI for confirmation

**Note**: The uploaded file stays in Gemini's cloud storage and can be accessed by your deployed Render service.

### Step 2: Deploy to Render

Once the PDF is uploaded, deploy to Render as normal. The server will:
- Check for the existing uploaded file
- Use it for RAG-based question answering
- Fall back to general knowledge if file not found

## Environment Variables

Required:
- `GEMINI_API_KEY` - Your Google AI API key

## Testing Locally

```bash
cd server
npm install
npm run dev
```

Then test with:
```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"message": "How do I create a calculated field in Tableau?"}'
```

## File Management

### List uploaded files:
```javascript
import { GoogleAIFileManager } from "@google/generative-ai";
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
const files = await fileManager.listFiles();
console.log(files);
```

### Delete a file:
```javascript
await fileManager.deleteFile("files/your-file-id");
```

## Architecture

```
User Question
    ↓
Chat Widget (Frontend)
    ↓
Express Server (Render)
    ↓
Gemini API with File Context
    ↓
RAG Response (Based on Tableau Manual)
```

## Troubleshooting

**Q: Getting "File not found" errors?**
A: Run `npm run upload-pdf` locally to upload the PDF first.

**Q: Responses don't seem accurate?**
A: Check that the file state is "ACTIVE" in Gemini File API.

**Q: Upload fails with memory error?**
A: Run the upload script locally, not on Render (free tier has limited memory).

## Model Used

- **gemini-1.5-flash-002** - Optimized for speed and cost-effectiveness
- Supports large context windows (perfect for 3800-page PDFs)
- File API integration for true RAG capabilities
