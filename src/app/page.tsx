"use client";
import { useState } from "react";
import { Box, AppBar, Toolbar, Typography, Paper, IconButton, InputBase, List, ListItem, ListItemText, Avatar, Fab } from "@mui/material";
import ConstructionIcon from "@mui/icons-material/Construction";
import MicIcon from "@mui/icons-material/Mic";
import SendIcon from "@mui/icons-material/Send";

const constructionColors = {
  primary: "#FFB300", // Construction yellow
  secondary: "#FF6F00", // Orange
  background: "#212121", // Dark gray
  chatBubble: "#FFF3E0", // Light yellow
};

export default function Home() {
  const [messages, setMessages] = useState([
    { from: "bot", text: "¡Hola! Pulsa el micrófono y habla en español." },
  ]);
  const [input, setInput] = useState("");

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: constructionColors.background }}>
      <AppBar position="static" sx={{ bgcolor: constructionColors.primary }}>
        <Toolbar>
          <ConstructionIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
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
        <Box sx={{ display: "flex", alignItems: "center", width: "100%", maxWidth: 420 }}>
          <InputBase
            sx={{
              flex: 1,
              bgcolor: "white",
              borderRadius: 2,
              px: 2,
              py: 1,
              mr: 1,
              fontSize: 18,
            }}
            placeholder="Escribe o usa el micrófono..."
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled
          />
          <IconButton color="primary" sx={{ bgcolor: constructionColors.primary, mr: 1 }} size="large" disabled>
            <SendIcon />
          </IconButton>
          <Fab color="secondary" aria-label="mic" sx={{ bgcolor: constructionColors.secondary }} disabled>
            <MicIcon />
          </Fab>
        </Box>
      </Box>
    </Box>
  );
}
