"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typing for the Web Speech API (not in TypeScript's DOM lib everywhere).
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type RecorderStatus = "idle" | "recording" | "stopped";

/**
 * Records audio with MediaRecorder and, at the same time, transcribes it with the
 * Web Speech API. Audio stays in memory as a blob URL and is never uploaded.
 */
export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState(""); // finalized text (editable after stopping)
  const [interim, setInterim] = useState(""); // in-progress words while speaking
  const [error, setError] = useState("");
  const [speechNote, setSpeechNote] = useState("");
  const [support, setSupport] = useState({ record: true, speech: true });

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const takeRef = useRef(0); // increments on reset so late speech results from an old take are ignored
  const recordingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    setSupport({
      record: typeof window !== "undefined" && "MediaRecorder" in window && !!navigator.mediaDevices?.getUserMedia,
      speech: !!getSpeechRecognition(),
    });
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  /** Throw away the current take: audio, transcript, and timer. */
  const reset = useCallback(() => {
    takeRef.current++;
    recordingRef.current = false;
    clearTimer();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setAudioUrl(null);
    setTranscript("");
    setInterim("");
    finalRef.current = "";
    interimRef.current = "";
    setElapsed(0);
    setError("");
    setSpeechNote("");
    setStatus("idle");
  }, []);

  const startRecognition = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) return;
    const rec = new SR();
    const take = takeRef.current;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e) => {
      if (take !== takeRef.current) return;
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current = `${finalRef.current} ${r[0].transcript.trim()}`.trim();
        else interimText += r[0].transcript;
      }
      interimRef.current = interimText.trim();
      setTranscript(finalRef.current);
      setInterim(interimRef.current);
    };
    rec.onerror = (e) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setSpeechNote("Transcription was blocked by the browser. Your audio is still recording.");
      } else if (e.error === "network") {
        setSpeechNote("Live transcription needs an internet connection. Your audio is still recording.");
      } else {
        setSpeechNote("Live transcription stopped unexpectedly. You can type or edit the transcript below.");
      }
      recognitionRef.current = null; // fatal error: don't auto-restart
    };
    // Browsers end recognition after a pause; restart it while we're still recording.
    rec.onend = () => {
      if (take !== takeRef.current) return;
      if (!recordingRef.current) {
        // Stopped: recognition has delivered its last results. Keep any words that never finalized.
        if (interimRef.current) {
          finalRef.current = `${finalRef.current} ${interimRef.current}`.trim();
          interimRef.current = "";
          setTranscript(finalRef.current);
        }
        setInterim("");
        return;
      }
      if (recognitionRef.current === rec) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };
    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      setSpeechNote("Live transcription couldn't start. You can type the transcript below.");
    }
  }, []);

  const start = useCallback(async () => {
    reset();
    if (!support.record) {
      setError("Recording isn't supported in this browser. Try a recent version of Chrome, Edge, Firefox, or Safari.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      setError(
        name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser's site settings, then try again."
          : name === "NotFoundError"
            ? "No microphone was found. Connect one and try again."
            : "We couldn't start the microphone. Please try again.",
      );
      return;
    }
    streamRef.current = stream;
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const take = takeRef.current;
    recorder.onstop = () => {
      releaseStream();
      if (take !== takeRef.current) return; // this take was discarded while recording
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setAudioUrl(url);
    };
    recorderRef.current = recorder;
    recorder.start();
    recordingRef.current = true;
    setStatus("recording");
    const startedAt = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 250);
    if (support.speech) startRecognition();
  }, [reset, startRecognition, support]);

  const stop = useCallback(() => {
    recordingRef.current = false;
    clearTimer();
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    rec?.stop(); // its final results still arrive; onend folds in any leftovers
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setStatus("stopped");
  }, []);

  // Clean up on unmount: stop the mic and free the audio.
  useEffect(
    () => () => {
      recordingRef.current = false;
      clearTimer();
      recognitionRef.current?.abort();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseStream();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  return { status, elapsed, audioUrl, transcript, setTranscript, interim, error, speechNote, support, start, stop, reset };
}

export const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
