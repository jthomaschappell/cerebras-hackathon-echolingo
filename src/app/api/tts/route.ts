import { NextRequest } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid 'text' field" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing Eleven Labs API key" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Default Eleven Labs voice (Rachel)
    const modelId = "eleven_multilingual_v2";

    const elevenlabs = new ElevenLabsClient({ apiKey });
    // Get a Node.js Readable stream from the SDK
    const audioStream = await elevenlabs.textToSpeech.stream(voiceId, {
      text,
      modelId,
      outputFormat: "mp3_44100_128",
    });

    // Return the stream as the response
    return new Response(audioStream as any, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[TTS] Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate speech" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 