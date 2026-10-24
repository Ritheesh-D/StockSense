// src/components/voice/FloatingVoiceButton.tsx
import React from 'react';
import { Mic, Sparkles, Volume2 } from 'lucide-react';
import { VoiceAssistantState } from '../../types/voice';

interface FloatingVoiceButtonProps {
  state: VoiceAssistantState;
  onClick: () => void;
  isOpen: boolean;
}

export const FloatingVoiceButton: React.FC<FloatingVoiceButtonProps> = ({
  state,
  onClick,
  isOpen
}) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isProcessing = state === 'processing';

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-22 sm:right-6 z-40 select-none">
      <button
        type="button"
        onClick={onClick}
        aria-label="StockSense AI Voice Assistant"
        className={`group relative flex items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-95 focus:outline-hidden focus:ring-4 focus:ring-blue-400/50 ${
          isListening
            ? 'w-16 h-16 bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 shadow-red-500/50 scale-105'
            : isSpeaking
            ? 'w-16 h-16 bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-500 shadow-emerald-500/50 scale-105'
            : isProcessing
            ? 'w-15 h-15 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 shadow-purple-500/50 animate-pulse'
            : 'w-14 h-14 bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105'
        }`}
      >
        {/* Glowing pulse rings */}
        <span
          className={`absolute -inset-1.5 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-500 pointer-events-none ${
            isListening
              ? 'bg-red-500 animate-ping'
              : isSpeaking
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-gradient-to-r from-blue-500 to-cyan-400 animate-pulse'
          }`}
        />

        {/* Inner Icon */}
        <div className="relative z-10 text-white flex items-center justify-center">
          {isSpeaking ? (
            <Volume2 className="w-6 h-6 animate-bounce" />
          ) : isProcessing ? (
            <Sparkles className="w-6 h-6 animate-spin" />
          ) : (
            <Mic className={`w-6 h-6 transition-transform ${isListening ? 'scale-110 stroke-[2.5]' : 'group-hover:scale-110'}`} />
          )}
        </div>

        {/* AI Tag Badge */}
        {!isOpen && (
          <span className="absolute -top-2 -left-2 px-2 py-0.5 rounded-full bg-slate-900/90 text-white text-[9px] font-black uppercase tracking-wider border border-white/20 shadow-md backdrop-blur-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            AI Voice
          </span>
        )}
      </button>
    </div>
  );
};
