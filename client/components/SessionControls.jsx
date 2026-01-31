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
    <div className="flex flex-col items-center justify-center w-full h-full gap-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome to Voice Ordering</h2>
        <p className="text-gray-600">Click the button below to start your order</p>
      </div>

      <button
        onClick={handleStartSession}
        disabled={isActivating}
        className={`
          relative group
          w-32 h-32 rounded-full
          ${isActivating
            ? 'bg-gradient-to-br from-gray-400 to-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-br from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 cursor-pointer'
          }
          shadow-2xl hover:shadow-3xl
          transform transition-all duration-300
          ${!isActivating && 'hover:scale-110'}
          flex items-center justify-center
        `}
      >
        <div className="absolute inset-0 rounded-full bg-white opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
        <Mic className="text-white" size={48} />
      </button>

      <p className="text-sm text-gray-500 mt-4">
        {isActivating ? "Starting session..." : "Tap to speak"}
      </p>
    </div>
  );
}

function SessionActive({ stopSession }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-6">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full mb-4">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-medium">Listening...</span>
        </div>
        <p className="text-gray-600">Speak naturally to place your order</p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 bg-green-400 rounded-full opacity-30 animate-ping"></div>
        <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-blue-600 shadow-2xl flex items-center justify-center">
          <Mic className="text-white animate-pulse" size={48} />
        </div>
      </div>

      <button
        onClick={stopSession}
        className="mt-8 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transform transition-all duration-200 hover:scale-105 flex items-center gap-2"
      >
        <MicOff size={20} />
        End Session
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
