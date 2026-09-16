export function isLiveTranscriptionActive(
  isRecording: boolean,
  isCaptureLive: boolean,
): boolean {
  return isRecording && isCaptureLive;
}

export function transcriptionStatus(isCaptureLive: boolean): "Transcription on" | null {
  return isCaptureLive ? "Transcription on" : null;
}
