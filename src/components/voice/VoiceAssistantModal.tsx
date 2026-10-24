// src/components/voice/VoiceAssistantModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  X, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  ArrowRight, 
  RefreshCw, 
  ShieldAlert, 
  CheckCircle2, 
  Send,
  Zap,
  Sliders,
  HelpCircle
} from 'lucide-react';
import { VoiceAssistantState, VoiceCommandResult } from '../../types/voice';
import { VoiceAssistantService, VoiceServiceContext } from '../../services/voiceAssistantService';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: VoiceServiceContext;
}

const SAMPLE_COMMANDS = [
  "Show low stock items",
  "What is my inventory score?",
  "What is today's inventory status?",
  "Find product Rice",
  "Show overstock products",
  "Which category has the highest stock?",
  "Export inventory report",
  "Add a new product",
  "Open analytics"
];

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  context
}) => {
  const [state, setState] = useState<VoiceAssistantState>('idle');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [isHighContrast, setIsHighContrast] = useState<boolean>(false);
  const [typedInput, setTypedInput] = useState<string>('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-listen when modal opens for true native assistant feel
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setLiveTranscript('');
      // Small timeout to let modal render smoothly
      const timer = setTimeout(() => {
        handleStartListening();
      }, 350);
      return () => clearTimeout(timer);
    } else {
      VoiceAssistantService.stopListening();
      VoiceAssistantService.stopSpeaking();
      setState('idle');
    }
  }, [isOpen]);

  const handleStartListening = () => {
    setErrorMessage(null);
    setLiveTranscript('');
    setState('listening');

    const started = VoiceAssistantService.startListening(
      (transcript, isFinal) => {
        setLiveTranscript(transcript);
        if (isFinal && transcript.trim()) {
          handleExecuteCommand(transcript);
        }
      },
      (error) => {
        setErrorMessage(error);
        setState('error');
      },
      () => {
        // Recognition ended
        if (state === 'listening' && !liveTranscript) {
          setState('idle');
        }
      }
    );

    if (!started) {
      setState('idle');
    }
  };

  const handleStopListening = () => {
    VoiceAssistantService.stopListening();
    if (liveTranscript.trim()) {
      handleExecuteCommand(liveTranscript);
    } else {
      setState('idle');
    }
  };

  const handleExecuteCommand = (commandText: string) => {
    VoiceAssistantService.stopListening();
    setState('processing');

    // Simulate smart AI analysis delay (300ms) for high-end feel
    setTimeout(() => {
      try {
        const result = VoiceAssistantService.processCommand(commandText, context);
        setLastResult(result);
        setState('speaking');

        if (!isVoiceMuted) {
          VoiceAssistantService.speak(
            result.spokenResponse,
            () => setState('speaking'),
            () => setState('completed')
          );
        } else {
          setState('completed');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Error processing command');
        setState('error');
      }
    }, 320);
  };

  const handleQuickCommandClick = (cmd: string) => {
    setLiveTranscript(cmd);
    handleExecuteCommand(cmd);
  };

  const handleTypedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedInput.trim()) return;
    const cmd = typedInput.trim();
    setTypedInput('');
    setLiveTranscript(cmd);
    handleExecuteCommand(cmd);
  };

  const handleStopSpeaking = () => {
    VoiceAssistantService.stopSpeaking();
    setState('completed');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div 
        className={`w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[85vh] transition-colors duration-300 border ${
          isHighContrast 
            ? 'bg-black text-white border-white/40' 
            : 'bg-slate-900/95 text-slate-100 border-slate-700/80'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-white">StockSense AI</h3>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[9px] font-bold uppercase tracking-wider">
                  English Voice Copilot
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Inventory intelligence & stock command center</p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-1.5">
            {/* High Contrast Toggle */}
            <button
              type="button"
              onClick={() => setIsHighContrast(!isHighContrast)}
              title="Toggle High Contrast Mode"
              className={`p-2 rounded-xl text-xs transition-colors ${
                isHighContrast ? 'bg-white text-black font-bold' : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Mute Voice Toggle */}
            <button
              type="button"
              onClick={() => {
                if (!isVoiceMuted) VoiceAssistantService.stopSpeaking();
                setIsVoiceMuted(!isVoiceMuted);
              }}
              title={isVoiceMuted ? 'Unmute AI Voice' : 'Mute AI Voice'}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isVoiceMuted ? <VolumeX className="w-4 h-4 text-amber-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Center Stage */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col justify-between">
          {/* Top Status & Transcript */}
          <div className="text-center space-y-3">
            {/* Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 border border-white/10 backdrop-blur-xs">
              {state === 'listening' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-red-300 font-bold">Listening... Speak in English</span>
                </>
              ) : state === 'processing' ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-indigo-300 font-bold">Analyzing Inventory Data...</span>
                </>
              ) : state === 'speaking' ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-bounce" />
                  <span className="text-emerald-300 font-bold">Generating Response...</span>
                </>
              ) : state === 'error' ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300 font-bold">Assistant Notice</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-cyan-300">Ready for Voice Commands</span>
                </>
              )}
            </div>

            {/* Live Transcript / Prompt Preview */}
            <div className="min-h-[50px] flex items-center justify-center px-4">
              {liveTranscript ? (
                <p className="text-base sm:text-lg font-medium text-white italic tracking-wide">
                  &ldquo;{liveTranscript}&rdquo;
                </p>
              ) : state === 'listening' ? (
                <p className="text-sm text-slate-400 animate-pulse">
                  Try saying &ldquo;Show low stock items&rdquo; or &ldquo;What is my inventory score?&rdquo;
                </p>
              ) : (
                <p className="text-sm text-slate-400">
                  Tap the microphone or select a prompt below
                </p>
              )}
            </div>
          </div>

          {/* Center Visualizer & Interaction Hub */}
          <div className="flex flex-col items-center justify-center my-4 py-2">
            {state === 'listening' ? (
              /* Animated Audio Waveform */
              <div className="flex items-center justify-center gap-1.5 h-20">
                {[40, 75, 95, 60, 85, 50, 90, 65, 45].map((height, i) => (
                  <div
                    key={i}
                    style={{
                      height: `${height}%`,
                      animationDuration: `${0.4 + (i % 3) * 0.2}s`
                    }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-blue-500 via-cyan-400 to-white animate-pulse"
                  />
                ))}
              </div>
            ) : state === 'speaking' ? (
              /* Speaking Audio Wave Animation */
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-1.5 h-16">
                  {[30, 80, 100, 50, 90, 70, 40].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-2 rounded-full bg-gradient-to-t from-emerald-500 to-cyan-300 animate-bounce"
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleStopSpeaking}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-300 transition-colors"
                >
                  Stop Audio
                </button>
              </div>
            ) : (
              /* Large Interactive Microphone Button */
              <div className="relative flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleStartListening}
                  className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-hidden"
                >
                  <Mic className="w-10 h-10 stroke-[2.2]" />
                </button>
                {/* Outer Glow Ring */}
                <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl animate-pulse pointer-events-none" />
              </div>
            )}

            {/* Error Message if any */}
            {errorMessage && (
              <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs max-w-md text-center">
                {errorMessage}
              </div>
            )}
          </div>

          {/* Hackathon Wow Factor: Voice Insight Card */}
          {lastResult && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md space-y-3 animate-scale-in">
              {/* You Said Row */}
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mt-0.5">
                  You Said:
                </span>
                <span className="text-xs sm:text-sm font-semibold text-cyan-300">
                  &ldquo;{lastResult.transcript}&rdquo;
                </span>
              </div>

              {/* AI Analysis Row */}
              <div className="flex items-start gap-2 pt-1 border-t border-white/10">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider shrink-0 mt-0.5">
                  AI Analysis:
                </span>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  {lastResult.spokenResponse}
                </p>
              </div>

              {/* Suggested Actions Buttons */}
              {lastResult.suggestedActions.length > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                    Suggested Action:
                  </span>
                  {lastResult.suggestedActions.map((act) => (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => {
                        act.action();
                        onClose();
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 ${
                        act.primary
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/30'
                          : 'bg-white/15 hover:bg-white/25 text-white'
                      }`}
                    >
                      <span>{act.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Voice Prompt Chips (Zero friction judge testing) */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Tap to Test Voice Queries:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {SAMPLE_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => handleQuickCommandClick(cmd)}
                  className="text-[11px] px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-left"
                >
                  &ldquo;{cmd}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Text Fallback Input */}
        <form onSubmit={handleTypedSubmit} className="p-3.5 border-t border-white/10 bg-black/30 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Or type a voice command in English..."
            className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-hidden focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={!typedInput.trim()}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
