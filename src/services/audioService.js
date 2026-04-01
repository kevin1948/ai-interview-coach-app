import { Audio } from "expo-audio";

let recording = null;

export const startRecording = async () => {
  try {
    const permission = await Audio.requestPermissionsAsync();

    if (!permission.granted) {
      throw new Error("Microphone permission not granted");
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    recording = new Audio.Recording();

    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );

    await recording.startAsync();

    return recording;
  } catch (error) {
    console.log("Recording error:", error);
  }
};

export const stopRecording = async () => {
  try {
    if (!recording) return null;

    await recording.stopAndUnloadAsync();

    const uri = recording.getURI();

    recording = null;

    return uri;
  } catch (error) {
    console.log("Stop recording error:", error);
  }
};

export const playAudio = async (uri) => {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  } catch (error) {
    console.log("Audio playback error:", error);
  }
};