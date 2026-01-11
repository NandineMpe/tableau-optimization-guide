import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

// URL of the Tableau Manual PDF
const PDF_URL = "https://help.tableau.com/current/offline/en-us/tableau_desktop.pdf";
const FILE_DISPLAY_NAME = "Tableau Desktop Manual";

export class TableauGeminiBrain {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.fileManager = new GoogleAIFileManager(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: "gemini-1.5-flash-002"
        });
        this.uploadedFile = null;
    }

    async initialize() {
        console.log("Initializing Tableau Knowledge Base with Gemini File API...");

        try {
            // Check if file is already uploaded
            const existingFiles = await this.fileManager.listFiles();
            const existingFile = existingFiles.files?.find(
                f => f.displayName === FILE_DISPLAY_NAME
            );

            if (existingFile && existingFile.state === "ACTIVE") {
                console.log("✅ Found existing Tableau manual in Gemini File API");
                console.log("File URI:", existingFile.uri);
                this.uploadedFile = existingFile;
                return;
            }

            // If not found, upload from URL automatically
            console.log("📥 Tableau manual not found. Uploading from URL...");
            console.log("This is a one-time operation and may take 5-10 minutes...");

            // Import required modules
            const https = await import('https');
            const fs = await import('fs');
            const path = await import('path');
            const os = await import('os');

            const tempPath = path.join(os.tmpdir(), 'tableau_desktop.pdf');

            // Download PDF
            await new Promise((resolve, reject) => {
                const file = fs.createWriteStream(tempPath);
                https.get(PDF_URL, (response) => {
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log("✅ PDF downloaded successfully");
                        resolve();
                    });
                }).on('error', (err) => {
                    fs.unlink(tempPath, () => { });
                    reject(err);
                });
            });

            // Upload to Gemini
            console.log("📤 Uploading to Gemini File API...");
            const uploadResult = await this.fileManager.uploadFile(tempPath, {
                mimeType: "application/pdf",
                displayName: FILE_DISPLAY_NAME,
            });

            console.log("⏳ Upload complete, waiting for processing...");

            // Wait for processing (max 10 minutes)
            let file = await this.fileManager.getFile(uploadResult.file.name);
            let attempts = 0;
            while (file.state === "PROCESSING" && attempts < 60) {
                console.log(`Processing... (${attempts + 1}/60)`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                file = await this.fileManager.getFile(uploadResult.file.name);
                attempts++;
            }

            // Clean up temp file
            try {
                fs.unlinkSync(tempPath);
                console.log("🧹 Cleaned up temporary file");
            } catch (e) {
                // Ignore cleanup errors
            }

            if (file.state === "ACTIVE") {
                this.uploadedFile = file;
                console.log("🎉 SUCCESS! Tableau manual is ready for RAG!");
                console.log("File URI:", file.uri);
            } else {
                console.error("⚠️ File processing timeout. State:", file.state);
                console.log("Server will use fallback mode");
            }

        } catch (error) {
            console.error("❌ Error during initialization:", error.message);
            console.log("Server will continue in fallback mode (general Tableau knowledge)");
        }

        console.log("Server initialization complete.");
    }

    async query(question) {
        try {
            let prompt;

            if (this.uploadedFile) {
                // Use RAG with the uploaded file
                prompt = [
                    {
                        fileData: {
                            mimeType: this.uploadedFile.mimeType,
                            fileUri: this.uploadedFile.uri
                        }
                    },
                    {
                        text: `You are an expert on Tableau Desktop. Use the Tableau Desktop manual provided to answer the following question accurately and concisely.\n\nQuestion: ${question}\n\nProvide a clear, helpful answer based on the manual.`
                    }
                ];
            } else {
                // Fallback: Use model knowledge only
                prompt = [
                    {
                        text: `You are an expert on Tableau Desktop software. Answer the following question based on your knowledge of Tableau.\n\nQuestion: ${question}\n\nNote: The full Tableau manual is not currently loaded, so provide the best answer you can based on general Tableau knowledge.`
                    }
                ];
            }

            const result = await this.model.generateContent(prompt);
            return result.response.text();

        } catch (error) {
            console.error("Error querying Gemini:", error);
            return `Error: ${error.message}. Please try rephrasing your question.`;
        }
    }

    // Helper method to upload file manually if needed
    async uploadPDF(localFilePath) {
        try {
            console.log("Uploading Tableau manual to Gemini File API...");

            const uploadResult = await this.fileManager.uploadFile(localFilePath, {
                mimeType: "application/pdf",
                displayName: FILE_DISPLAY_NAME,
            });

            console.log("Upload successful:", uploadResult.file.displayName);

            // Wait for file to be processed
            let file = await this.fileManager.getFile(uploadResult.file.name);
            while (file.state === "PROCESSING") {
                console.log("Processing file...");
                await new Promise(resolve => setTimeout(resolve, 5000));
                file = await this.fileManager.getFile(uploadResult.file.name);
            }

            if (file.state === "ACTIVE") {
                this.uploadedFile = file;
                console.log("File is ready for use!");
                return file;
            } else {
                throw new Error(`File processing failed with state: ${file.state}`);
            }
        } catch (error) {
            console.error("Error uploading PDF:", error);
            throw error;
        }
    }
}
