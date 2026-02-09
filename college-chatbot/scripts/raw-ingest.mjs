import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env' });

const PINECONE_HOST = "https://college-bot-bo3kyvn.svc.aped-4627-b74a.pinecone.io";
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

const ingest = async () => {
  console.log("Starting Raw HTTP Ingestion...");

  if (!PINECONE_API_KEY || !GOOGLE_API_KEY) {
    console.error("Error: Missing API Keys in environment configuration.");
    return;
  }

  const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  const filePath = path.join(process.cwd(), 'data/faq.txt');
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    return;
  }

  const chunks = fs.readFileSync(filePath, 'utf-8')
    .split('\n\n')
    .filter(c => c.trim() !== '');

  console.log(`Processing ${chunks.length} chunks...`);

  const vectors = [];
  for (let i = 0; i < chunks.length; i++) {
    const text = chunks[i];
    try {
      const result = await model.embedContent(text);
      const values = Array.from(result.embedding.values).map(v => Number(v));

      vectors.push({
        id: `doc-${i}`,
        values: values,
        metadata: { text: text }
      });
      process.stdout.write(".");
    } catch (e) {
      console.error(`Error embedding chunk ${i}`);
    }
  }

  console.log(`\nGenerated ${vectors.length} vectors. Uploading to Pinecone...`);

  try {
    const response = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vectors: vectors })
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log("Upload successful:", responseData);
    } else {
      console.error("Upload failed:", response.status, responseData);
    }
  } catch (error) {
    console.error("Network request failed:", error);
  }
};

ingest();