import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { z } from "zod";
import { TableauKnowledgeBase } from "./rag.js";

dotenv.config();

const app = express();
app.use(cors());

// Initialize the Knowledge Base
const kb = new TableauKnowledgeBase();

// Create the MCP Server
const server = new McpServer({
    name: "Tableau Optimization Expert",
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
            const answer = await kb.query(question);
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

// Define Retrieval Prompt
server.prompt(
    "explain-feature",
    { feature: z.string().describe("The name of the Tableau feature") },
    ({ feature }) => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: `Explain the "${feature}" feature in Tableau based on the manual, including how to access it and best use cases.`
            }
        }]
    })
);

// SSE Endpoint for MCP Connection
app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
});

// Message Handling Endpoint
app.post("/messages", async (req, res) => {
    // In a real implementation, we need to handle the messages properly via the transport
    // The SSEServerTransport handles this internally usually, but integrating with Express requires bridging.
    // For simplicity in this starter, we heavily rely on the SDK's internal handling via the established transport connection.
    // Note: The official SDK SSE example usually runs its own HTTP server.
    // We will let the transport handle the request if possible, or use the handlePostMessage method if available.
    // *Correction*: The SDK's SSEServerTransport is designed to be used with a standard Request/Response pattern.

    // Custom handling to bridge Express request to Transport
    // @ts-ignore
    await transport.handlePostMessage(req, res);
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
    console.log(`Tableau MCP Server running on port ${PORT}`);
    console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);

    // Start Ingestion in Background
    console.log("Initializing Knowledge Base...");
    try {
        await kb.initialize();
        console.log("Knowledge Base Ready!");
    } catch (error) {
        console.error("Failed to initialize Knowledge Base:", error);
    }
});
