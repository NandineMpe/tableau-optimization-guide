import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { Document } from "langchain/document";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { ChatOpenAI } from "@langchain/openai";
import { RetrievalQAChain } from "langchain/chains";
import axios from "axios";
import pdf from "pdf-parse";
import fs from "fs";
import path from "path";

// URL of the Tableau Manual
const PDF_URL = "https://help.tableau.com/current/offline/en-us/tableau_desktop.pdf?_gl=1*5xawr0*_gcl_au*MTI5OTMzODI0OC4xNzY4MDc3MDMz*_ga*MjUyMzE1MDMyLjE3NjgwNzcwMzU.*_ga_8YLN0SNXVS*czE3NjgwNzcwMzUkbzEkZzAkdDE3NjgwNzcwMzUkajYwJGwwJGgw";
const LOCAL_PDF_PATH = "./tableau_manual.pdf";

export class TableauKnowledgeBase {
    private vectorStore: MemoryVectorStore | null = null;
    private model: ChatOpenAI;

    constructor() {
        this.model = new ChatOpenAI({
            modelName: "gpt-4o", // Or gpt-3.5-turbo
            temperature: 0,
        });
    }

    async initialize() {
        if (this.vectorStore) return;

        console.log("Checking for local PDF...");
        if (!fs.existsSync(LOCAL_PDF_PATH)) {
            console.log("Downloading Tableau Manual (this may take a while)...");
            await this.downloadPdf();
        } else {
            console.log("Local PDF found.");
        }

        console.log("Parsing PDF...");
        const rawText = await this.parsePdf();

        console.log("Creating chunks...");
        // Split text into manageable chunks
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        const docs = await splitter.createDocuments([rawText]);
        console.log(`Created ${docs.length} chunks. Generating embeddings...`);

        // Create Vector Store in Memory
        // Note: For 3800 pages, this is heavy. 
        // In a production Dedalus environment, you might want to switch this to ChromaDB or LanceDB on disk.
        this.vectorStore = await MemoryVectorStore.fromDocuments(
            docs,
            new OpenAIEmbeddings()
        );
    }

    async query(question: string): Promise<string> {
        if (!this.vectorStore) {
            return "Knowledge base is still initializing. Please try again in a few minutes.";
        }

        const chain = RetrievalQAChain.fromLLM(
            this.model,
            this.vectorStore.asRetriever()
        );

        const response = await chain.call({
            query: question,
        });

        return response.text;
    }

    private async downloadPdf() {
        const response = await axios({
            url: PDF_URL,
            method: "GET",
            responseType: "arraybuffer", // Important for binary data
        });
        fs.writeFileSync(LOCAL_PDF_PATH, response.data);
    }

    private async parsePdf(): Promise<string> {
        const dataBuffer = fs.readFileSync(LOCAL_PDF_PATH);
        const data = await pdf(dataBuffer);
        return data.text;
    }
}
