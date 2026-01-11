import { GoogleGenerativeAI, GoogleAIFileManager } from "@google/generative-ai";

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
                console.log("Found existing Tableau manual in Gemini File API");
                this.uploadedFile = existingFile;
            } else {
                console.log("Tableau manual not found or not active. Please upload manually.");
                console.log("Due to Render's memory constraints, automatic PDF upload is disabled.");
                console.log("Upload the PDF manually using the Gemini File API or use a pre-uploaded file URI.");
            }
        } catch (error) {
            console.error("Error checking for uploaded files:", error.message);
        }

        console.log("Server initialized successfully.");
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
