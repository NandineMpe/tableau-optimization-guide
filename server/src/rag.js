import { GoogleGenerativeAI } from "@google/generative-ai";

// URL of the Tableau Manual
const PDF_URL = "https://help.tableau.com/current/offline/en-us/tableau_desktop.pdf";

export class TableauGeminiBrain {
    constructor(apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        // We do NOT use FileManager anymore to save memory
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
    }

    async initialize() {
        console.log("Server initialized (Lightweight Mode).");
        // No download, no upload. Pure cloud.
        // Force redeploy - using gemini-1.5-flash-latest model
    }

    async query(question) {
        try {
            // In Lightweight Mode, we pass the Public URL directly to valid models or context
            // However, Gemini File API requires a URI.
            // Since we keep crashing, we will use a TEXT-ONLY context about Tableau for this "Rescue" version
            // OR we try to trust the file IS uploaded from a previous run if possible.

            // EMERGENCY FIX: We will just answer as an Expert without the 100MB context for now
            // To properly fix this on Free Tier requires an external Vector DB (Pinecone) which takes time.
            // For now, let's enable the Chatbot to actually TALK.

            const result = await this.model.generateContent([
                { text: `You are an expert on Tableau Software aka "Tee's Guide". \n\nUser Question: ${question}` }
            ]);

            return result.response.text();
        } catch (error) {
            return `Error querying Gemini: ${error.message}`;
        }
    }
}
