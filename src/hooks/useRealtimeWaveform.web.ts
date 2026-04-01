import { logger } from '../utils/logger';
import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 40;

// webkitAudioContext is not in the standard TS lib — augment Window for backwards compat
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return "";
  }

  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }

  return "";
}

export default function useRealtimeWaveform() {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const [isRecording, setIsRecording] = useState(false);
  const [audioFilePath, setAudioFilePath] = useState<string | null>(null);

  const audioContextRef    = useRef<AudioContext | null>(null);
  const micStreamRef       = useRef<MediaStream | null>(null);
  const animationRef       = useRef<number | null>(null);
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const recordedChunksRef  = useRef<Blob[]>([]);
  const smoothedLevelRef   = useRef(0);
  const noiseFloorRef      = useRef(0.015);
  const currentObjectUrlRef = useRef<string | null>(null);

  function pushBar(level: number): void {
    setBars((prev) => [...prev.slice(1), level]);
  }

  function smoothLevel(raw: number): number {
    const prev = smoothedLevelRef.current;
    const attack = 0.28;
    const release = 0.1;

    const next =
      raw > prev
        ? prev + (raw - prev) * attack
        : prev + (raw - prev) * release;

    smoothedLevelRef.current = next;
    return next;
  }

  function processVoiceLevel(rms: number): number {
    let noiseFloor = noiseFloorRef.current;

    if (rms < noiseFloor * 1.8) {
      noiseFloor = noiseFloor * 0.98 + rms * 0.02;
      noiseFloor = Math.max(0.005, Math.min(0.03, noiseFloor));
      noiseFloorRef.current = noiseFloor;
    }

    const gate = noiseFloor * 2.8;
    let level = rms - gate;

    if (level < 0) level = 0;

    level = level / 0.18;
    level = Math.max(0, Math.min(1, level));
    level = Math.pow(level, 0.9);

    return smoothLevel(level);
  }

  async function start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Browser microphone API is not supported.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    micStreamRef.current = stream;

    // Fallback to webkit-prefixed API for older browsers
    const AudioCtxClass = (window.AudioContext || window.webkitAudioContext) as typeof AudioContext;
    const audioContext = new AudioCtxClass();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.88;

    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);

    const timeData = new Uint8Array(analyser.fftSize);

    smoothedLevelRef.current = 0;
    noiseFloorRef.current = 0.015;
    setBars(Array(BAR_COUNT).fill(0));

    recordedChunksRef.current = [];

    if (typeof MediaRecorder !== "undefined") {
      const mimeType = getSupportedMimeType();

      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 32000,
      };

      if (mimeType) {
        recorderOptions.mimeType = mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
    }

    const tick = () => {
      analyser.getByteTimeDomainData(timeData);

      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        // i < timeData.length guarantees access is in-bounds
        const normalized = (timeData[i]! - 128) / 128;
        sum += normalized * normalized;
      }

      const rms = Math.sqrt(sum / timeData.length);
      const level = processVoiceLevel(rms);

      pushBar(level);
      animationRef.current = requestAnimationFrame(tick);
    };

    tick();
    setIsRecording(true);
  }

  function cleanupWebAudio(): void {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  function stop(): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      try {
        const mediaRecorder = mediaRecorderRef.current;

        if (!mediaRecorder) {
          cleanupWebAudio();
          resolve(audioFilePath);
          return;
        }

        mediaRecorder.onstop = () => {
          cleanupWebAudio();

          if (recordedChunksRef.current.length > 0) {
            const mimeType =
              mediaRecorder.mimeType || getSupportedMimeType() || "audio/webm";

            const blob = new Blob(recordedChunksRef.current, {
              type: mimeType,
            });

            if (currentObjectUrlRef.current) {
              URL.revokeObjectURL(currentObjectUrlRef.current);
              currentObjectUrlRef.current = null;
            }

            const url = URL.createObjectURL(blob);
            currentObjectUrlRef.current = url;
            setAudioFilePath(url);
            resolve(url);
          } else {
            resolve(audioFilePath);
          }
        };

        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        } else {
          cleanupWebAudio();
          resolve(audioFilePath);
        }
      } catch (error) {
        logger.log("Web stop error:", error);
        cleanupWebAudio();
        resolve(audioFilePath);
      }
    });
  }

  useEffect(() => {
    return () => {
      try {
        cleanupWebAudio();

        if (currentObjectUrlRef.current) {
          URL.revokeObjectURL(currentObjectUrlRef.current);
          currentObjectUrlRef.current = null;
        }
      } catch {}
    };
  }, []);

  return {
    bars,
    isRecording,
    start,
    stop,
    audioFilePath,
  };
}
