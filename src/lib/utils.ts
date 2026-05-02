import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(seconds: number) {
  return `${Math.ceil(seconds / 60).toLocaleString()} min`;
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function absoluteUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.KOYEB_PUBLIC_DOMAIN ? `https://${process.env.KOYEB_PUBLIC_DOMAIN}` : undefined) ??
    "http://localhost:3000";
  return new URL(path, base).toString();
}
