import { useEffect, useRef, useState } from "react";
import customLogo from "/assets/logo.png";
import backgroundImage from "/assets/background.webp";
import SessionControls from "./SessionControls";
import ToolPanel from "./ToolPanel";

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const peerConnection = useRef(null);
  const audioElement = useRef(null);

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.value;
    const model = data.model;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime/calls";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const sdp = await sdpResponse.text();
    const answer = { type: "answer", sdp };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Stop current session, clean up peer connection and data channel
  function stopSession() {
    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);

        // Send initial greeting from the agent
        setTimeout(() => {
          sendClientEvent({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: "Call Started"
                }
              ]
            }
          });

          // Trigger response from the model
          sendClientEvent({ type: "response.create" });
        }, 500); // Small delay to ensure the session is fully ready
      });
    }
  }, [dataChannel]);

  return (
    <div
      className="relative min-h-screen w-screen bg-cover bg-center bg-no-repeat overflow-hidden flex flex-col font-sans"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      {/* Dynamic Overlay for Depth */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-0"></div>

      {/* Glassmorphism Header */}
      <nav className="relative z-30 h-20 flex items-center justify-center bg-white/10 backdrop-blur-md border-b border-white/10 shadow-xl px-8">
        <div className="flex items-center gap-6">
          <div className="p-1 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30 shadow-inner">
            <img src={customLogo} alt="Rehmat-e-Shereen" className="h-14 w-14 object-contain" />
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg">
              Rehmat-e-Shereen
            </h1>
            <p className="text-sm font-medium text-blue-100/80 tracking-widest uppercase opacity-90">
              Premium Voice Bakery
            </p>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex overflow-hidden">
        {/* Main Interaction Area */}
        <section className="flex-1 flex items-center justify-center p-8">
          <div className="relative z-10 w-full max-w-4xl aspect-video flex items-center justify-center">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              isSessionActive={isSessionActive}
            />
          </div>
        </section>

        {/* Premium Glass Sidebar */}
        <aside className="relative z-40 w-[420px] bg-white/10 backdrop-blur-2xl border-l border-white/10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
          <ToolPanel
            sendClientEvent={sendClientEvent}
            events={events}
            isSessionActive={isSessionActive}
            stopSession={stopSession}
          />
        </aside>
      </main>
    </div>
  );
}
