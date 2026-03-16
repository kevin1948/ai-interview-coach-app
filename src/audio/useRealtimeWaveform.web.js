import { useEffect, useRef, useState } from "react";

const BAR_COUNT = 40;

export default function useRealtimeWaveform() {
  const [bars, setBars] = useState(Array(BAR_COUNT).fill(0));
  const [isRecording, setIsRecording] = useState(false);
  const [audioFilePath, setAudioFilePath] = useState(null);

  const audioContextRef = useRef(null);
  const micStreamRef = useRef(null);
  const animationRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const smoothedLevelRef = useRef(0);
  const noiseFloorRef = useRef(0.015);

  function pushBar(level) {
    setBars((prev) => [...prev.slice(1), level]);
  }

  function smoothLevel(raw) {
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

  function processVoiceLevel(rms) {
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

  async function start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Browser microphone API is not supported.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micStreamRef.current = stream;

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioCtx();
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
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    }

    const tick = () => {
      analyser.getByteTimeDomainData(timeData);

      let sum = 0;
      for (let i = 0; i < timeData.length; i++) {
        const normalized = (timeData[i] - 128) / 128;
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

  function cleanupWebAudio() {
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

    setIsRecording(false);
  }

  async function stop() {
    return new Promise((resolve) => {
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
            const blob = new Blob(recordedChunksRef.current, {
              type: "audio/webm",
            });

            const url = URL.createObjectURL(blob);
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
        console.log("Web stop error:", error);
        cleanupWebAudio();
        resolve(audioFilePath);
      }
    });
  }

  useEffect(() => {
    return () => {
      try {
        cleanupWebAudio();
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