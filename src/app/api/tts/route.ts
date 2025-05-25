import { NextRequest } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export async function POST(req: NextRequest) {
  try {
    const { text, voiceId, mode } = await req.json();
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

    // Default to Enrique M Nieto if no voiceId provided
    const selectedVoiceId = typeof voiceId === "string" && voiceId.length > 0 ? voiceId : "gbTn1bmCvNgk0QEAVyfM";
    const modelId = "eleven_multilingual_v2";

    // TODO: There is a dropdown where you can cycle the voices. 
    // gbTn1bmCvNgk0QEAVyfM // Enrique M Nieto. 
    // Nh2zY9kknu6z4pZy6FhD // David Martin
    // 6xftrpatV0jGmFHxDjUv // Martin Osborne
    // sKgg4MPUDBy69X7iv3fA // Alejandro Duran
    // KHCvMklQZZo0O30ERnVn // Sara Martin. 

    // The ElevenLabs API will auto-detect language, but you can pass the text in the correct language.
    // If you want to force language, you could adjust here, but for now just pass the text as is.

    const elevenlabs = new ElevenLabsClient({ apiKey });
    // Get a Node.js Readable stream from the SDK
    const audioStream = await elevenlabs.textToSpeech.stream(selectedVoiceId, {
      text,
      modelId,
      outputFormat: "mp3_44100_128",
    });

    // Return the stream as the response
    return new Response(audioStream as unknown as ReadableStream<Uint8Array>, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    console.error("[TTS] Error:", err);
    return new Response(JSON.stringify({ error: "Failed to generate speech" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 