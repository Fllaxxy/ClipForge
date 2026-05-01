import type { TranscriptBoundary } from "@/lib/clips/boundaries";
import { CaptionStyleSchema, DEFAULT_CAPTION_STYLE, type CaptionStyle } from "@/lib/subtitles/types";

type CaptionChunk = {
  startMs: number;
  endMs: number;
  text: string;
};

function toAssTime(ms: number) {
  const totalCentiseconds = Math.max(0, Math.round(ms / 10));
  const centiseconds = totalCentiseconds % 100;
  const totalSeconds = Math.floor(totalCentiseconds / 100);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
}

function toSrtTime(ms: number) {
  const totalMilliseconds = Math.max(0, Math.round(ms));
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  return `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")},${milliseconds
    .toString()
    .padStart(3, "0")}`;
}

function hexToAss(hex: string) {
  const clean = hex.replace("#", "");
  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);
  return `&H00${b}${g}${r}`;
}

function escapeAssText(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, "\\N");
}

function chunkSegment(segment: TranscriptBoundary, style: CaptionStyle): CaptionChunk[] {
  const words = segment.text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];

  const perChunk = style.wordsPerCaptionChunk;
  const durationPerWord = (segment.endMs - segment.startMs) / words.length;
  const chunks: CaptionChunk[] = [];

  for (let index = 0; index < words.length; index += perChunk) {
    const text = words.slice(index, index + perChunk).join(" ");
    chunks.push({
      startMs: Math.round(segment.startMs + index * durationPerWord),
      endMs: Math.round(segment.startMs + Math.min(words.length, index + perChunk) * durationPerWord),
      text: style.uppercase ? text.toUpperCase() : text
    });
  }

  return chunks;
}

export function generateCaptionChunks(
  segments: TranscriptBoundary[],
  styleInput: Partial<CaptionStyle> = {}
) {
  const style = CaptionStyleSchema.parse({ ...DEFAULT_CAPTION_STYLE, ...styleInput });
  return segments.flatMap((segment) => chunkSegment(segment, style));
}

function highlightText(text: string, style: CaptionStyle) {
  const words = text.split(/\s+/);
  const keywordIndex = words.findIndex((word) => word.length >= 5);
  if (keywordIndex === -1) {
    return escapeAssText(text);
  }

  const highlighted = [...words];
  highlighted[keywordIndex] = `{\\c${hexToAss(style.highlightColor)}&}${escapeAssText(
    highlighted[keywordIndex]
  )}{\\c${hexToAss(style.textColor)}&}`;
  return highlighted
    .map((word, index) => (index === keywordIndex ? word : escapeAssText(word)))
    .join(" ");
}

function styleMargin(style: CaptionStyle) {
  if (style.position === "top") return 250;
  if (style.position === "center") return 860;
  return 430;
}

export function generateAssSubtitles(input: {
  segments: TranscriptBoundary[];
  style?: Partial<CaptionStyle>;
}) {
  const style = CaptionStyleSchema.parse({ ...DEFAULT_CAPTION_STYLE, ...input.style });
  const chunks = generateCaptionChunks(input.segments, style);
  const marginV = styleMargin(style);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${style.fontSize},${hexToAss(style.textColor)},${hexToAss(
    style.highlightColor
  )},${hexToAss(style.strokeColor)},&HAA000000,-1,0,0,0,100,100,0,0,1,5,1,2,90,90,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = chunks.map(
    (chunk) =>
      `Dialogue: 0,${toAssTime(chunk.startMs)},${toAssTime(
        chunk.endMs
      )},Default,,0,0,0,,${highlightText(chunk.text, style)}`
  );

  return `${header}\n${events.join("\n")}\n`;
}

export function generateSrtSubtitles(segments: TranscriptBoundary[]) {
  return segments
    .map(
      (segment, index) =>
        `${index + 1}\n${toSrtTime(segment.startMs)} --> ${toSrtTime(segment.endMs)}\n${segment.text.trim()}\n`
    )
    .join("\n");
}
