import { useEffect, useRef, useState } from "react";
import { AudioManager, AudioRecorder } from "react-native-audio-api";

const BAR_COUNT = 40;

export default function useRealtimeWaveform() {
  const [bars, setBars] = useState(Array(BAR_COUNT).fill(0));
  const [isRecording, setIsRecording] = useState(false);
  const [audioFilePath, setAudioFilePath] = useState(null);

  const recorderRef = useRef(null);
  const smoothedLevelRef = useRef(0);
  const noiseFloorRef = useRef(0.015);

  function pushBar(level) {
    setBars((prev) => [...prev.slice(1), level]);
  }

  function smoothLevel(raw) {
    const prev = smoothedLevelRef.current;
    const attack = 0.36;
    const release = 0.12;

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

    const gate = noiseFloor * 2.5;
    let level = rms - gate;

    if (level < 0) level = 0;

    // higher mobile sensitivity
    level = level / 0.1;
    level = Math.max(0, Math.min(1, level));
    level = Math.pow(level, 0.8);

    return smoothLevel(level);
  }

  async function start() {
    if (!recorderRef.current) {
      recorderRef.current = new AudioRecorder();
      recorderRef.current.enableFileOutput();
    }

    const permission = await AudioManager.requestRecordingPermissions();
    if (permission !== "Granted") {
      throw new Error("Microphone permission denied");
    }

    await AudioManager.setAudioSessionActivity(true);

    smoothedLevelRef.current = 0;
    noiseFloorRef.current = 0.015;
    setBars(Array(BAR_COUNT).fill(0));

    recorderRef.current.onAudioReady(
      {
        sampleRate: 16000,
        bufferLength: 1024,
        channelCount: 1,
      },
      ({ buffer }) => {
        const channel = buffer.getChannelData(0);

        let sum = 0;
        for (let i = 0; i < channel.length; i++) {
          sum += channel[i] * channel[i];
        }

        const rms = Math.sqrt(sum / channel.length);

        // stronger boost for mobile
        const boostedRms = rms * 3.2;
        const level = processVoiceLevel(boostedRms);

        pushBar(level);
      }
    );

    const result = recorderRef.current.start();

    if (result?.path) {
      setAudioFilePath(result.path);
    }

    setIsRecording(true);
  }

  function stop() {
    if (!recorderRef.current) return audioFilePath;

    const result = recorderRef.current.stop();
    recorderRef.current.clearOnAudioReady();

    AudioManager.setAudioSessionActivity(false);
    setIsRecording(false);

    return result?.path || audioFilePath;
  }

  useEffect(() => {
    return () => {
      try {
        stop();
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