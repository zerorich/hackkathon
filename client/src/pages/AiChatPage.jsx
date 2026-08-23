import { useEffect, useRef, useState } from "react";
import { Mic, Send, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { api } from "../lib/api";
import { LoadingView, ErrorView } from "../components/StateViews";
import { friendlyError } from "../lib/errorMessages";
import { getSpeechRecognition, speak, speechSupported, stopSpeaking } from "../lib/speech";

async function loadOrCreateConversation() {
  const res = await api.get("/ai/chat/conversations?limit=1");
  if (res.items?.length) return res.items[0];
  return api.post("/ai/chat/conversations", {});
}

export default function AiChatPage() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(true);
  const [speakingId, setSpeakingId] = useState(null);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);
  const micSupported = speechSupported();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const conv = await loadOrCreateConversation();
        if (cancelled) return;
        setConversation(conv);
        const history = await api.get(`/ai/chat/conversations/${conv.id}/messages?limit=50`);
        if (cancelled) return;
        setMessages(history.items);
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      stopSpeaking();
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(text) {
    const content = text.trim();
    if (!content || !conversation || sending) return;
    setSending(true);
    setError(null);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `temp-${Date.now()}`, role: "USER", content, created_at: new Date().toISOString() },
    ]);
    try {
      const res = await api.post(`/ai/chat/conversations/${conversation.id}/messages`, { content });
      setMessages((prev) => [
        ...prev.filter((m) => !String(m.id).startsWith("temp-")),
        res.user_message,
        res.assistant_message,
      ]);
      if (voiceReplies) {
        setSpeakingId(res.assistant_message.id);
        speak(res.assistant_message.content, { onEnd: () => setSpeakingId(null) });
      }
    } catch (err) {
      setError(err);
      setInput(content);
      setMessages((prev) => prev.filter((m) => !String(m.id).startsWith("temp-")));
    } finally {
      setSending(false);
    }
  }

  function toggleMic() {
    if (!micSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) return;
    recognition.lang = "uz-UZ";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      handleSend(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  function replayMessage(message) {
    if (speakingId === message.id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setSpeakingId(message.id);
    speak(message.content, { onEnd: () => setSpeakingId(null) });
  }

  if (loading) return <LoadingView label="Zehn AI ulanmoqda…" />;
  if (error && !conversation) return <ErrorView error={error} onRetry={() => window.location.reload()} />;

  return (
    <div className="page ai-page">
      <div className="page-header">
        <div>
          <h1>Zehn AI</h1>
          <p className="page-subtitle">Gapiring yoki yozing — AI sizga yordam beradi</p>
        </div>
        <button
          className="icon-btn"
          onClick={() => {
            if (voiceReplies) {
              stopSpeaking();
              setSpeakingId(null);
            }
            setVoiceReplies((v) => !v);
          }}
          title={voiceReplies ? "Ovozli javoblar yoqilgan" : "Ovozli javoblar o'chirilgan"}
        >
          {voiceReplies ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
      </div>

      <div className="ai-thread" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="ai-empty">
            <Sparkles size={28} />
            <p className="muted">Savolingizni yozing yoki mikrofon tugmasini bosib gapiring.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`ai-bubble ${m.role === "USER" ? "ai-bubble-user" : "ai-bubble-assistant"}`}>
            <p>{m.content}</p>
            {m.role === "ASSISTANT" && (
              <button className="ai-replay" onClick={() => replayMessage(m)}>
                {speakingId === m.id ? <Square size={12} /> : <Volume2 size={12} />}
              </button>
            )}
          </div>
        ))}
        {sending && <div className="ai-bubble ai-bubble-assistant ai-bubble-typing">Zehn AI yozmoqda…</div>}
      </div>

      {error && <p className="field-error center">{friendlyError(error)}</p>}

      <form
        className="ai-composer"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
      >
        {micSupported && (
          <button
            type="button"
            className={`icon-btn${listening ? " ai-mic-active" : ""}`}
            onClick={toggleMic}
            title="Gapirish"
          >
            <Mic size={18} />
          </button>
        )}
        <input
          className="text-input"
          placeholder={listening ? "Tinglanmoqda…" : "Xabar yozing…"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="icon-btn ai-send" disabled={sending || !input.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
