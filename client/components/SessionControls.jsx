import { useState } from "react";
import { Mic, MicOff } from "react-feather";

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-10">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black text-white mb-2 drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] tracking-tight">
          Welcome to <span className="text-blue-400">Voice Bakery</span>
        </h2>
        <p className="text-xl font-medium text-white/70 tracking-wide drop-shadow-md">
          Experience ordering like never before.
        </p>
      </div>

      <div className="relative group">
        <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
        <button
          onClick={handleStartSession}
          disabled={isActivating}
          className={`
            relative z-10
            w-40 h-40 rounded-[2.5rem]
            ${isActivating
              ? 'bg-white/10 cursor-not-allowed border-white/5'
              : 'bg-white/10 hover:bg-white/20 cursor-pointer border-white/20'
            }
            border shadow-2xl backdrop-blur-xl
            transform transition-all duration-500
            ${!isActivating && 'hover:scale-110 hover:rotate-3'}
            flex items-center justify-center
          `}
        >
          {isActivating ? (
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Mic className="text-white drop-shadow-lg" size={56} />
          )}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-lg font-bold text-white tracking-widest uppercase opacity-80 drop-shadow-md">
          {isActivating ? "Establishing Connection..." : "Click to Start Session"}
        </p>
        {!isActivating && (
          <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-transparent rounded-full animate-bounce mt-4"></div>
        )}
      </div>
    </div>
  );
}

function SessionActive({ stopSession }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-10">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-green-500/20 text-green-400 border border-green-500/30 backdrop-blur-xl rounded-full mb-4 shadow-xl">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
          <span className="font-bold tracking-widest uppercase text-xs">AI Assistant Listening</span>
        </div>
        <h2 className="text-4xl font-black text-white drop-shadow-2xl tracking-tight"> How can I help you?</h2>
      </div>

      <div className="relative">
        {/* Subtle Wave Animation */}
        <div className="absolute inset-0 bg-blue-500/20 rounded-[3rem] blur-3xl animate-pulse"></div>
        <div className="relative w-48 h-48 rounded-[3rem] bg-white/10 backdrop-blur-2xl border border-white/20 shadow-2xl flex items-center justify-center group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-50"></div>
          <Mic className="text-white animate-bounce-slow z-10 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" size={64} />

          {/* Audio Visualizer Mockup */}
          <div className="absolute bottom-6 flex items-end gap-1 px-4">
            {[2, 4, 8, 5, 9, 4, 6, 3, 7].map((h, i) => (
              <div
                key={i}
                className="w-1 bg-blue-400/50 rounded-full animate-visualizer"
                style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <button
        onClick={stopSession}
        className="group relative mt-4 px-10 py-4 bg-white/10 hover:bg-red-500/20 text-white rounded-2xl font-bold shadow-2xl backdrop-blur-md border border-white/10 transform transition-all duration-300 hover:scale-110 flex items-center gap-4 hover:border-red-500/30"
      >
        <div className="p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500 transition-colors">
          <MicOff size={20} className="text-red-400 group-hover:text-white transition-colors" />
        </div>
        <span className="tracking-wide">Stop Assistant</span>
      </button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  isSessionActive,
}) {
  return (
    <div className="flex items-center justify-center w-full h-full">
      {isSessionActive ? (
        <SessionActive stopSession={stopSession} />
      ) : (
        <SessionStopped startSession={startSession} />
      )}
    </div>
  );
}
