"use client";
import { useState, useRef, useEffect, ReactNode } from "react";
import { Box, AppBar, Toolbar, Typography, Paper, List, ListItem, ListItemText, Avatar, Select, MenuItem, FormControl, InputLabel, Button } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import MicIcon from "@mui/icons-material/Mic";

const constructionColors = {
  primary: "#FFB300", // Construction yellow
  secondary: "#FF6F00", // Orange
  background: "#212121", // Dark gray
  chatBubble: "#FFF3E0", // Light yellow
};

const BAR_COLORS = ["#fff", "#fff", "#fff", "#fff", "#fff"];

function VoiceVisualizer({ active, stream }: { active: boolean; stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use fewer, wider bars for Google Meet style
  const BAR_COUNT = 5;
  const BAR_WIDTH = 8;
  const BAR_GAP = 6;
  const BAR_RADIUS = 4;
  const barHeights = useRef<number[]>(Array(BAR_COUNT).fill(10));

  useEffect(() => {
    if (!active || !stream || !canvasRef.current) return;
    const audioCtx = new window.AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser.fftSize = 32;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let running = true;
    function draw() {
      if (!running) return;
      analyser.getByteFrequencyData(dataArray);
      // Map frequency bins to bars
      for (let i = 0; i < BAR_COUNT; i++) {
        // Average a range of bins for each bar
        const start = Math.floor((i * dataArray.length) / BAR_COUNT);
        const end = Math.floor(((i + 1) * dataArray.length) / BAR_COUNT);
        const avg =
          dataArray.slice(start, end).reduce((a, b) => a + b, 0) /
          (end - start || 1);
        // Smooth animation: lerp to new height
        barHeights.current[i] =
          barHeights.current[i] * 0.6 + ((avg / 255) * 32 + 8) * 0.4;
      }
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      // Center bars horizontally
      const totalWidth = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;
      const x0 = (canvas.width - totalWidth) / 2;
      for (let i = 0; i < BAR_COUNT; i++) {
        ctx!.fillStyle = BAR_COLORS[i % BAR_COLORS.length];
        const x = x0 + i * (BAR_WIDTH + BAR_GAP);
        const y = canvas.height - barHeights.current[i];
        // Draw rounded bar
        ctx!.beginPath();
        ctx!.moveTo(x + BAR_RADIUS, y);
        ctx!.lineTo(x + BAR_WIDTH - BAR_RADIUS, y);
        ctx!.quadraticCurveTo(x + BAR_WIDTH, y, x + BAR_WIDTH, y + BAR_RADIUS);
        ctx!.lineTo(x + BAR_WIDTH, y + barHeights.current[i] - BAR_RADIUS);
        ctx!.quadraticCurveTo(
          x + BAR_WIDTH,
          y + barHeights.current[i],
          x + BAR_WIDTH - BAR_RADIUS,
          y + barHeights.current[i]
        );
        ctx!.lineTo(x + BAR_RADIUS, y + barHeights.current[i]);
        ctx!.quadraticCurveTo(
          x,
          y + barHeights.current[i],
          x,
          y + barHeights.current[i] - BAR_RADIUS
        );
        ctx!.lineTo(x, y + BAR_RADIUS);
        ctx!.quadraticCurveTo(x, y, x + BAR_RADIUS, y);
        ctx!.closePath();
        ctx!.fill();
      }
      requestAnimationFrame(draw);
    }
    draw();
    return () => {
      running = false;
      audioCtx.close();
    };
  }, [active, stream]);
  return <canvas ref={canvasRef} width={60} height={40} style={{ display: "block" }} />;
}

type Message = {
  from: string;
  text: string | ReactNode;
  english?: string;
  audioUrl?: string | null;
  audioLoading?: boolean;
  audioError?: string | null;
};

const VOICES = [
  { id: "gbTn1bmCvNgk0QEAVyfM", name: "Enrique M Nieto" },
  { id: "Nh2zY9kknu6z4pZy6FhD", name: "David Martin" },
  { id: "6xftrpatV0jGmFHxDjUv", name: "Martin Osborne" },
  { id: "sKgg4MPUDBy69X7iv3fA", name: "Alejandro Duran" },
  { id: "KHCvMklQZZo0O30ERnVn", name: "Sara Martin" },
];

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { from: "bot", text: "¡Hola! Pulsa el micrófono y habla en español.", english: undefined },
  ]);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].id);
  const [lastEnglish, setLastEnglish] = useState<string | null>(null);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);

  // Start recording audio
  const startRecording = async () => {
    setRecording(true);
    audioChunksRef.current = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    setMediaStream(stream);
    const mediaRecorder = new window.MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };
    mediaRecorder.onstop = handleStop;
    mediaRecorder.start();
  };

  // Stop recording audio
  const stopRecording = () => {
    setRecording(false);
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    mediaRecorderRef.current?.stop();
  };

  // Handle audio after recording stops
  const handleStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    setMessages((msgs) => [
      ...msgs,
      { from: "user", text: "[Audio enviado, transcribiendo...]", english: undefined },
    ]);
    // Send audio to backend for transcription and translation
    const formData = new FormData();
    formData.append("audio", audioBlob, "audio.webm");
    const res = await fetch("/api/transcribe", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setMessages((msgs) => [
      ...msgs.slice(0, -1),
      data.transcript && data.english
        ? {
            from: "user",
            text: (
              <span>
                <span>{data.transcript}</span>
                <br />
                <span style={{ color: '#388e3c', fontWeight: 500, fontSize: 16 }}>
                  {data.english}
                </span>
              </span>
            ),
            english: data.english,
          }
        : { from: "user", text: data.transcript || "[No se pudo transcribir]", english: undefined },
    ]);
  };

  // Play English translation as audio for a specific message
  const playEnglishAudio = async (msgIdx: number, englishText: string, autoPlay = false) => {
    setMessages((prev) => prev.map((msg, idx) => idx === msgIdx ? { ...msg, audioLoading: true, audioError: null } : msg));
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: englishText, voiceId: selectedVoice }),
      });
      if (!res.ok) throw new Error("Failed to fetch audio");
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      setMessages((prev) => prev.map((msg, idx) => idx === msgIdx ? { ...msg, audioUrl: url, audioLoading: false } : msg));
      setCurrentAudioUrl(url);
      setHasPlayed(autoPlay ? false : true);
      if (autoPlay) {
        setTimeout(() => {
          audioRef.current?.play();
        }, 100);
      }
    } catch (err: unknown) {
      setMessages((prev) => prev.map((msg, idx) => idx === msgIdx ? { ...msg, audioLoading: false, audioError: err instanceof Error ? err.message : "Unknown error" } : msg));
    }
  };

  // When a new English translation is received, auto-load and play audio
  useEffect(() => {
    const latestIdx = messages.length - 1;
    const latest = messages[latestIdx];
    if (latest && latest.english && latest.english !== lastEnglish && !latest.audioUrl && !latest.audioLoading) {
      setLastEnglish(latest.english);
      playEnglishAudio(latestIdx, latest.english, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // When audio finishes playing, allow replay
  const handleAudioEnded = () => {
    setHasPlayed(true);
  };

  // When user clicks play on a previous message
  const handlePlayClick = (msgIdx: number, english: string, audioUrl?: string | null) => {
    setCurrentAudioUrl(audioUrl || null);
    setHasPlayed(true);
    if (!audioUrl) {
      playEnglishAudio(msgIdx, english, false);
    } else {
      setTimeout(() => {
        audioRef.current?.play();
      }, 100);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: constructionColors.background }}>
      <AppBar position="static" sx={{ bgcolor: constructionColors.primary }}>
        <Toolbar sx={{ justifyContent: "center", display: "flex" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", flexGrow: 1 }}>
            <ConstructionIcon sx={{ fontSize: 36, mr: 1, color: constructionColors.secondary }} />
            <Typography
              variant="h4"
              sx={{
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 900,
                letterSpacing: 2,
                color: constructionColors.secondary,
                textShadow: '1px 1px 4px #fff3e0',
                userSelect: 'none',
                textTransform: 'uppercase',
              }}
            >
              Echolingo
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "calc(100vh - 64px)",
          p: 2,
        }}
      >
        {/* Voice selection dropdown on tan card */}
        <Paper
          elevation={6}
          sx={{
            width: "100%",
            maxWidth: 420,
            mb: 2,
            bgcolor: constructionColors.chatBubble,
            p: 2,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <FormControl sx={{ minWidth: 220 }} size="small">
            <InputLabel id="voice-select-label">Voz</InputLabel>
            <Select
              labelId="voice-select-label"
              id="voice-select"
              value={selectedVoice}
              label="Voz"
              onChange={(e) => setSelectedVoice(e.target.value)}
            >
              {VOICES.map((voice) => (
                <MenuItem key={voice.id} value={voice.id}>{voice.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
        <Paper
          elevation={6}
          sx={{
            width: "100%",
            maxWidth: 420,
            flex: 1,
            mb: 2,
            bgcolor: constructionColors.chatBubble,
            p: 2,
            overflowY: "auto",
            minHeight: 320,
            maxHeight: 400,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <List sx={{ width: "100%" }}>
            {messages.map((msg, idx) => (
              <ListItem key={idx} sx={{ justifyContent: msg.from === "bot" ? "flex-start" : "flex-end" }}>
                <Avatar sx={{ bgcolor: msg.from === "bot" ? constructionColors.primary : constructionColors.secondary, mr: 1 }}>
                  {msg.from === "bot" ? <ConstructionIcon /> : "T"}
                </Avatar>
                <ListItemText
                  primary={msg.text}
                  primaryTypographyProps={{
                    sx: {
                      color: constructionColors.background,
                      fontWeight: msg.from === "bot" ? 600 : 400,
                    },
                  }}
                />
                {/* Show play button for all user messages with English translation */}
                {msg.english && (
                  <>
                    {msg.audioLoading && <span style={{ marginLeft: 8, color: constructionColors.secondary, fontWeight: 600 }}>Loading...</span>}
                    <button
                      style={{ marginLeft: 8, padding: "4px 12px", borderRadius: 6, background: constructionColors.secondary, color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}
                      onClick={() => handlePlayClick(idx, msg.english!, msg.audioUrl)}
                      disabled={msg.audioLoading}
                    >
                      Play English Audio
                    </button>
                    {msg.audioError && <span style={{ color: "red", marginLeft: 8 }}>{msg.audioError}</span>}
                  </>
                )}
              </ListItem>
            ))}
          </List>
          {/* Audio element for playback */}
          {currentAudioUrl && (
            <audio ref={audioRef} src={currentAudioUrl} controls style={{ width: "100%", marginTop: 8 }} onEnded={handleAudioEnded} autoPlay={!hasPlayed} />
          )}
        </Paper>
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", maxWidth: 420, mt: 1 }}>
          <Button
            variant="contained"
            color={recording ? "error" : "secondary"}
            sx={{
              bgcolor: recording ? "#d32f2f" : constructionColors.secondary,
              width: "100%",
              height: 64,
              borderRadius: 2,
              fontSize: 20,
              fontWeight: 700,
              boxShadow: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textTransform: "none",
              transition: "background 0.2s",
              '&:hover': {
                bgcolor: recording ? "#b71c1c" : "#ff9800",
              },
            }}
            onClick={recording ? stopRecording : startRecording}
            startIcon={recording ? <VoiceVisualizer active={recording} stream={mediaStream} /> : <MicIcon sx={{ fontSize: 36 }} />}
          >
            {recording ? "Grabando... Pulsa para parar" : "Pulsa para hablar"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
