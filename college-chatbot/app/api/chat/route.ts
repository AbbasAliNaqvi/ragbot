import { GoogleGenerativeAI } from "@google/generative-ai";

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "";
const PINECONE_HOST = "https://college-bot-bo3kyvn.svc.aped-4627-b74a.pinecone.io";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const userQuery = messages[messages.length - 1].content;

    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    let context = "";

    try {
      const embeddingModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
      const embeddingResult = await embeddingModel.embedContent(userQuery);
      const vector = embeddingResult.embedding.values;

      const searchResponse = await fetch(`${PINECONE_HOST}/query`, {
        method: 'POST',
        headers: { 
          'Api-Key': PINECONE_API_KEY, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          vector, 
          topK: 3, 
          includeMetadata: true, 
          includeValues: false 
        })
      });

      const searchData = await searchResponse.json();
      if (searchData.matches) {
        context = searchData.matches.map((m: any) => m.metadata?.text).join('\n---\n');
      }
    } catch (dbError) {
      console.error("Database search failed:", dbError);
    }

    let selectedModel = "gemini-1.5-flash";
    try {
      const modelsResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`);
      const modelsData = await modelsResponse.json();
      
      if (modelsData.models) {
        const availableModel = modelsData.models.find((m: any) => 
          m.supportedGenerationMethods?.includes("generateContent") &&
          (m.name.includes("flash") || m.name.includes("pro")) 
        );
        
        if (availableModel) {
          selectedModel = availableModel.name.replace("models/", "");
        }
      }
    } catch (e) {
      console.warn("Model list retrieval failed, defaulting to fallback.");
    }

    const finalPrompt = `
      You are a professional college assistant.
      Answer based on this context. If unknown, strictly state that the information is unavailable.
      ANSWER IN A CONCISE MANNER.
      ANSWER BASIC GREETIGS AND FAREWELLS IN A FRIENDLY MANNER.
      DO NOT PROVIDE INFORMATION OUTSIDE THE CONTEXT.
      ALL CAPITAL LETTERS QUESTIONS ARE ALLOWED AND SHOULD BE ANSWERED NORMALLY.
      HEY, HELLO, HI, BYE, GOODBYE, SEE YOU, THANKS, THANK YOU, OKAY, OK, SURE, NO PROBLEM, ANYTIME, YOU'RE WELCOME ARE ALL GREETINGS OR FAREWELLS.
      CONTEXT: ${context}
      QUESTION: ${userQuery}
    `;

    const chatModel = genAI.getGenerativeModel({ model: selectedModel });
    const result = await chatModel.generateContentStream(finalPrompt);

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) controller.enqueue(encoder.encode(text));
          }
        } catch (e) {
          console.error("Stream processing error:", e);
          controller.error(e);
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { 
      headers: { 'Content-Type': 'text/plain; charset=utf-8' } 
    });

  } catch (error: any) {
    console.error("Backend Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}