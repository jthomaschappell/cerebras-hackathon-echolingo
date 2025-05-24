"use client";
import { useState, useRef, useEffect } from "react";
import { Box, AppBar, Toolbar, Typography, Paper, IconButton, InputBase, List, ListItem, ListItemText, Avatar, Fab } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import MicIcon from "@mui/icons-material/Mic";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";

const constructionColors = {
  primary: "#FFB300", // Construction yellow
  secondary: "#FF6F00", // Orange
  background: "#212121", // Dark gray
  chatBubble: "#FFF3E0", // Light yellow
};

function VoiceVisualizer({ active, stream }: { active: boolean; stream: MediaStream | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Use fewer, wider bars for Google Meet style
  const BAR_COUNT = 5;
  const BAR_WIDTH = 8;
  const BAR_GAP = 6;
  const BAR_RADIUS = 4;
  const BAR_COLORS = ["#fff", "#fff", "#fff", "#fff", "#fff"];
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

export default function Home() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "¡Hola! Pulsa el micrófono y habla en español." },
  ]);
  const [input, setInput] = useState("");
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

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
      { from: "user", text: "[Audio enviado, transcribiendo...]" },
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
          }
        : { from: "user", text: data.transcript || "[No se pudo transcribir]" },
    ]);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: constructionColors.background }}>
      <AppBar position="static" sx={{ bgcolor: constructionColors.primary }}>
        <Toolbar sx={{ justifyContent: "center" }}>
          <ConstructionIcon sx={{ mr: 2 }} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              textAlign: "center",
              flexGrow: 1,
            }}
          >
            Traductor de Voz para Obreros
          </Typography>
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
              </ListItem>
            ))}
          </List>
        </Paper>
        <Box sx={{ display: "flex", justifyContent: "center", width: "100%", maxWidth: 420, mt: 2 }}>
          <Fab
            color={recording ? "error" : "secondary"}
            aria-label="mic"
            sx={{ bgcolor: recording ? "#d32f2f" : constructionColors.secondary, width: 72, height: 72 }}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? (
              <VoiceVisualizer active={recording} stream={mediaStream} />
            ) : (
              <MicIcon sx={{ fontSize: 40 }} />
            )}
          </Fab>
        </Box>
      </Box>
    </Box>
  );
}
