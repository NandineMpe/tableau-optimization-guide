import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { TableauGeminiBrain } from "./rag.js";

dotenv.config();

const app = express();
app.use(cors());

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
        } catch (error: any) {
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

// Message Handling Endpoint
app.post("/messages", async (req, res) => {
    // In a real implementation this should handle the post message via the transport or adapter
    // For this demo, we assume the transport is connected via SSE and this endpoint is just for compliance
    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Tableau MCP Server (Gemini Powered) running on port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);

    // Start Ingestion
    try {
        await brain.initialize();
    } catch (error) {
        console.error("Failed to initialize Knowledge Base:", error);
    }
});
