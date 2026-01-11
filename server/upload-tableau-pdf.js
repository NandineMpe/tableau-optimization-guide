/**
 * One-time script to upload the Tableau PDF to Gemini File API
 * 
 * Run this locally ONCE to upload the PDF:
 * node upload-tableau-pdf.js
 * 
 * After upload, the file will be available in Gemini's cloud storage
 * and can be used by the deployed Render service.
 */

import { GoogleAIFileManager } from "@google/generative-ai";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PDF_URL = "https://help.tableau.com/current/offline/en-us/tableau_desktop.pdf";
const FILE_DISPLAY_NAME = "Tableau Desktop Manual";
const LOCAL_PDF_PATH = path.join(__dirname, "tableau_desktop.pdf");

async function downloadPDF() {
    console.log("Downloading Tableau PDF...");

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(LOCAL_PDF_PATH);

        https.get(PDF_URL, (response) => {
            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log("Download complete!");
                resolve(LOCAL_PDF_PATH);
            });
        }).on('error', (err) => {
            fs.unlink(LOCAL_PDF_PATH, () => { });
            reject(err);
        });
    });
}

async function uploadToGemini() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY not found in .env file");
    }

    const fileManager = new GoogleAIFileManager(apiKey);

    // Check if already uploaded
    console.log("Checking for existing uploads...");
    const existingFiles = await fileManager.listFiles();
    const existingFile = existingFiles.files?.find(
        f => f.displayName === FILE_DISPLAY_NAME
    );

    if (existingFile) {
        console.log("File already exists!");
        console.log("File URI:", existingFile.uri);
        console.log("State:", existingFile.state);

        if (existingFile.state === "ACTIVE") {
            console.log("✅ File is ready to use!");
            return existingFile;
        }
    }

    // Download PDF
    await downloadPDF();

    // Upload to Gemini
    console.log("Uploading to Gemini File API...");
    const uploadResult = await fileManager.uploadFile(LOCAL_PDF_PATH, {
        mimeType: "application/pdf",
        displayName: FILE_DISPLAY_NAME,
    });

    console.log("Upload initiated:", uploadResult.file.name);

    // Wait for processing
    let file = await fileManager.getFile(uploadResult.file.name);
    while (file.state === "PROCESSING") {
        console.log("Processing... (this may take a few minutes)");
        await new Promise(resolve => setTimeout(resolve, 10000));
        file = await fileManager.getFile(uploadResult.file.name);
    }

    // Clean up local file
    fs.unlinkSync(LOCAL_PDF_PATH);
    console.log("Cleaned up local PDF file");

    if (file.state === "ACTIVE") {
        console.log("✅ SUCCESS! File is ready!");
        console.log("File URI:", file.uri);
        console.log("File Name:", file.name);
        console.log("\nYour Render service can now use this file for RAG!");
        return file;
    } else {
        throw new Error(`Upload failed with state: ${file.state}`);
    }
}

// Run the upload
uploadToGemini()
    .then(() => {
        console.log("\n🎉 All done! Your RAG system is ready.");
        process.exit(0);
    })
    .catch((error) => {
        console.error("❌ Error:", error.message);
        process.exit(1);
    });
