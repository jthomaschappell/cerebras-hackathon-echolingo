import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    console.log("[Transcribe] Received POST request");
    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile || typeof audioFile === "string") {
      console.error("[Transcribe] No audio file provided");
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }
    const arrayBuffer = await audioFile.arrayBuffer();
    const audioBytes = Buffer.from(arrayBuffer).toString("base64");
    console.log(`[Transcribe] Audio file received, size: ${audioBytes.length} bytes`);

    // Prepare Google Cloud Speech-to-Text API request
    const apiKey = process.env.GOOGLE_SPEECH_API_KEY;
    if (!apiKey) {
      console.error("[Transcribe] Missing Google Cloud Speech API key");
      return NextResponse.json({ error: "Missing Google Cloud Speech API key" }, { status: 500 });
    }
    console.log("[Transcribe] Sending audio to Google Speech-to-Text API");
    const googleRes = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS",
            sampleRateHertz: 48000,
            languageCode: "es-ES",
            enableAutomaticPunctuation: true,
          },
          audio: { content: audioBytes },
        }),
      }
    );
    const googleData = await googleRes.json();
    console.log("[Transcribe] Google API response:", JSON.stringify(googleData));
    if (!googleData.results || !googleData.results[0]) {
      console.warn("[Transcribe] No transcription results returned");
      return NextResponse.json({ transcript: "" });
    }
    const transcript = googleData.results
      .map((result: any) => result.alternatives[0].transcript)
      .join(" ");
    console.log(`[Transcribe] Transcript: ${transcript}`);

    // Send transcript to OpenRouter API for translation
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterKey) {
      console.error("[Transcribe] Missing OpenRouter API key");
      return NextResponse.json({ error: "Missing OpenRouter API key" }, { status: 500 });
    }
    const openRouterPayload = {
      model: "qwen/qwen3-32b",
      messages: [
        { role: "user", content: transcript + " /no_think" },
        { role: "system", content: "You are a helpful assistant that translates Spanish to English. You only translate the words, you don't respond or add any other text." }
      ]
    };
    console.log("[Transcribe] Sending transcript to OpenRouter for translation");
    const openRouterRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openRouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openRouterPayload),
    });
    const openRouterData = await openRouterRes.json();
    console.log("[Transcribe] OpenRouter API response:", JSON.stringify(openRouterData));
    let english = "";
    try {
      english = openRouterData.choices?.[0]?.message?.content?.trim() || "";
    } catch (e) {
      console.error("[Transcribe] Error extracting translation", e);
    }
    return NextResponse.json({ transcript, english });
  } catch (err) {
    console.error("[Transcribe] Error:", err);
    return NextResponse.json({ error: "Failed to transcribe audio" }, { status: 500 });
  }
} 