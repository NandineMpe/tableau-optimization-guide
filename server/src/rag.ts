import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs";
import axios from "axios";
import path from "path";

// URL of the Tableau Manual
const PDF_URL = "https://help.tableau.com/current/offline/en-us/tableau_desktop.pdf?_gl=1*5xawr0*_gcl_au*MTI5OTMzODI0OC4xNzY4MDc3MDMz*_ga*MjUyMzE1MDMyLjE3NjgwNzcwMzU.*_ga_8YLN0SNXVS*czE3NjgwNzcwMzUkbzEkZzAkdDE3NjgwNzcwMzUkajYwJGwwJGgw";
const LOCAL_PDF_PATH = path.resolve("./tableau_manual.pdf");

export class TableauGeminiBrain {
    private genAI: GoogleGenerativeAI;
    private fileManager: GoogleAIFileManager;
    private model: any;
    private uploadedFileUri: string | null = null;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.fileManager = new GoogleAIFileManager(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    }

    async initialize() {
        console.log("Checking for local PDF...");
        if (!fs.existsSync(LOCAL_PDF_PATH)) {
            console.log("Downloading Tableau Manual (this may take a while)...");
            await this.downloadPdf();
        } else {
            console.log("Local PDF found.");
        }

        console.log("Uploading PDF to Gemini File API...");
        try {
            const uploadResponse = await this.fileManager.uploadFile(LOCAL_PDF_PATH, {
                mimeType: "application/pdf",
                displayName: "Tableau Desktop Manual",
            });

            this.uploadedFileUri = uploadResponse.file.uri;
            console.log(`File Uploaded Successfully! URI: ${this.uploadedFileUri}`);

            // Wait for file to proceed to ACTIVE state
            let file = await this.fileManager.getFile(uploadResponse.file.name);
            while (file.state === "PROCESSING") {
                process.stdout.write(".");
                await new Promise((resolve) => setTimeout(resolve, 10_000));
                file = await this.fileManager.getFile(uploadResponse.file.name);
            }

            if (file.state !== "ACTIVE") {
                throw new Error(`File processing failed. State: ${file.state}`);
            }
            console.log("\nTableau Manual is Ready for Queries!");

        } catch (error) {
            console.error("Error uploading file:", error);
            throw error;
        }
    }

    async query(question: string): Promise<string> {
        if (!this.uploadedFileUri) {
            return "Knowledge base is still initializing. Please try again in a few minutes.";
        }

        try {
            const result = await this.model.generateContent([
                {
                    fileData: {
                        mimeType: "application/pdf",
                        fileUri: this.uploadedFileUri
                    }
                },
                { text: `You are an expert on Tableau Software. Answer the user's question accurately based strictly on the provided Tableau Desktop manual. \n\nUser Question: ${question}` }
            ]);

            return result.response.text();
        } catch (error: any) {
            return `Error querying Gemini: ${error.message}`;
        }
    }

    private async downloadPdf() {
        const response = await axios({
            url: PDF_URL,
            method: "GET",
            responseType: "arraybuffer",
        });
        fs.writeFileSync(LOCAL_PDF_PATH, response.data);
    }
}
