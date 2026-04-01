import { useEffect, useRef, useState } from "react";
import { AudioManager, AudioRecorder } from "react-native-audio-api";

const BAR_COUNT = 40;

export default function useRealtimeWaveform() {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const [isRecording, setIsRecording] = useState(false);
  const [audioFilePath, setAudioFilePath] = useState<string | null>(null);

  // react-native-audio-api does not ship TypeScript declarations yet.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recorderRef = useRef<any>(null);
  const smoothedLevelRef = useRef(0);
  const noiseFloorRef = useRef(0.015);

  function pushBar(level: number): void {
    setBars((prev) => [...prev.slice(1), level]);
  }

  function smoothLevel(raw: number): number {
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

  function processVoiceLevel(rms: number): number {
    let noiseFloor = noiseFloorRef.current;

    if (rms < noiseFloor * 1.8) {
      noiseFloor = noiseFloor * 0.98 + rms * 0.02;
      noiseFloor = Math.max(0.005, Math.min(0.03, noiseFloor));
      noiseFloorRef.current = noiseFloor;
    }

    const gate = noiseFloor * 2.5;
    let level = rms - gate;

    if (level < 0) level = 0;

    level = level / 0.1;
    level = Math.max(0, Math.min(1, level));
    level = Math.pow(level, 0.8);

    return smoothLevel(level);
  }

  function resetBars(): void {
    smoothedLevelRef.current = 0;
    noiseFloorRef.current = 0.015;
    setBars(Array(BAR_COUNT).fill(0));
  }

  async function start(): Promise<void> {
    try {
      console.log("Waveform start: requesting permission");
      const permission = await AudioManager.requestRecordingPermissions();
      console.log("Waveform start: permission =", permission);

      if (permission !== "Granted") {
        throw new Error("Microphone permission denied");
      }

      if (recorderRef.current) {
        try {
          recorderRef.current.clearOnAudioReady?.();
          recorderRef.current.stop?.();
        } catch {}
        recorderRef.current = null;
      }

      console.log("Waveform start: creating recorder");
      const recorder = new AudioRecorder();

      console.log("Waveform start: enabling file output");
      recorder.enableFileOutput();

      resetBars();

      console.log("Waveform start: setting onAudioReady");
      recorder.onAudioReady(
        {
          sampleRate: 16000,
          bufferLength: 1024,
          channelCount: 1,
        },
        // library callback type is not in TS declarations — use any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ buffer }: { buffer: any }) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const channel: any = buffer.getChannelData(0);

            let sum = 0;
            for (let i = 0; i < channel.length; i++) {
              sum += channel[i] * channel[i];
            }

            const rms = Math.sqrt(sum / channel.length);
            const boostedRms = rms * 3.2;
            const level = processVoiceLevel(boostedRms);

            pushBar(level);
          } catch (error) {
            console.log("Waveform processing error:", error);
          }
        }
      );

      recorderRef.current = recorder;

      console.log("Waveform start: starting recorder");
      const result = recorder.start();
      console.log("Waveform start: recorder result =", result);

      // Result<T> is a discriminated union — narrow with 'in' before accessing .path
      if (result && 'path' in result && result.path) {
        setAudioFilePath(result.path);
      }

      setIsRecording(true);
      console.log("Waveform start: success");
    } catch (error) {
      console.log("Recorder start error:", error);
      setIsRecording(false);
      throw error;
    }
  }

  async function stop(): Promise<string | null> {
    try {
      console.log("Waveform stop: called");

      if (!recorderRef.current) {
        return audioFilePath;
      }

      const recorder = recorderRef.current;
      recorderRef.current = null;

      try {
        recorder.clearOnAudioReady?.();
      } catch (error) {
        console.log("Waveform stop: clearOnAudioReady error:", error);
      }

      const result = await Promise.resolve(recorder.stop?.());
      console.log("Waveform stop: result =", result);

      setIsRecording(false);

      const finalPath = result?.path || audioFilePath || null;
      if (finalPath) {
        setAudioFilePath(finalPath);
      }

      resetBars();
      return finalPath;
    } catch (error) {
      console.log("Recorder stop error:", error);
      setIsRecording(false);
      resetBars();
      return audioFilePath;
    }
  }

  useEffect(() => {
    return () => {
      try {
        if (recorderRef.current) {
          recorderRef.current.clearOnAudioReady?.();
          recorderRef.current.stop?.();
          recorderRef.current = null;
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
