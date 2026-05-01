export type TranscriptSegmentResult = {
  startMs: number;
  endMs: number;
  text: string;
  confidence?: number;
};

export type TranscriptionInput = {
  audioPath: string;
  durationSeconds: number;
  projectTitle: string;
};

export interface TranscriptionProvider {
  name: string;
  transcribe(input: TranscriptionInput): Promise<TranscriptSegmentResult[]>;
}
