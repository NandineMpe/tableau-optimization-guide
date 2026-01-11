import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { TableauGeminiBrain } from "./rag.js";

dotenv.config();

const app = express();
app.use(cors({ origin: "*" }));
app.use(express.json()); // Allow JSON body parsing for the chat widget

// Initialize the Knowledge Base with Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing in .env file.");
    process.exit(1);
}

const brain = new TableauGeminiBrain(apiKey);

// Create the MCP Server
const server = new McpServer({
    name: "Tableau Optimization Expert (Gemini)",
    version: "1.0.0",
});

// Define the Tool
server.tool(
    "query_tableau_manual",
    "Ask a question about Tableau Desktop based on the official documentation.",
    {
        question: z.string().describe("The user's question about Tableau"),
    },
    async ({ question }) => {
        try {
            const answer = await brain.query(question);
            return {
                content: [{ type: "text", text: answer }],
            };
        } catch (error) {
            return {
                content: [{ type: "text", text: `Error querying knowledge base: ${error.message}` }],
                isError: true,
            };
        }
    }
);

// SSE Endpoint for MCP Connection
app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

// Health Check Endpoint
app.get("/messages", (req, res) => {
    res.send("Tableau AI Server is Running! Send POST requests to this endpoint to chat.");
});

// HTTP Endpoint for Chat Widget
app.post("/messages", async (req, res) => {
    const userMessage = req.body.message;
    if (!userMessage) {
        return res.status(400).json({ error: "Message is required" });
    }

    try {
        const answer = await brain.query(userMessage);
        res.json({ content: [{ text: answer }] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Tableau MCP Server (Gemini Powered) running on port ${PORT}`);

    // Start Ingestion
    try {
        await brain.initialize();
    } catch (error) {
        console.error("Failed to initialize Knowledge Base:", error);
    }
});
