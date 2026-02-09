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
      You are a smart, professional, and helpful admission counselor for GTBIT (Guru Tegh Bahadur Institute of Technology).

      **YOUR STRICT INSTRUCTIONS:**

      1. **GREETINGS & CHITCHAT:** - If the user says "Hi", "Hello", "Hey", "Good Morning", or asks "How are you?", reply politely and ask how you can help them regarding the college. 
         - DO NOT look for greetings in the context. DO NOT say "Information unavailable" for greetings.

      2. **VAGUE QUERIES (The "Do You Mean" Rule):**
         - If the user sends a single word or short phrase (e.g., "Location", "Metro", "Fees", "Principal"), assume the most likely question and clarify it.
         - Example: If user says "Location", reply: "Do you mean the location of GTBIT? It is located in G-8 Area, Rajouri Garden, New Delhi."
         - Example: If user says "Metro", reply: "Do you mean the nearest metro station? The nearest stations are Subhash Nagar (Blue Line) and Mayapuri (Pink Line)."

      3. **HINGLISH SUPPORT:**
         - If the user speaks in Hindi/Hinglish (e.g., "Bhai fees kitni hai?", "Placement kaisi hai?"), reply in a natural, professional Hinglish mix.
         - If the user speaks in English, reply in standard English.

      4. **USING CONTEXT:**
         - Use the **CONTEXT** below to answer factual questions.
         - If the specific information is completely missing from the context, politely say: "I do not have that specific information available at the moment."

      5. **FORMATTING:**
         - Be concise.
         - NO EMOJIS.

      **CONTEXT FROM DATABASE:**
      ${context}

      **USER QUERY:**
      ${userQuery}
      
      **YOUR ANSWER:**
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