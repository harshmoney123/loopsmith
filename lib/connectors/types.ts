import type { Signal, ToolOutcome } from "@/lib/types";

/**
 * Connector architecture — the real sensor + tools layer.
 *
 * Each connector talks DIRECTLY to a provider API (fetch, no SDKs) reading
 * credentials from env, exactly like AgentWeb's backend connectors. A connector
 * is "configured" when its credentials are present; otherwise the engine falls
 * back to fixtures so the demo always runs. This is the port pattern: the engine
 * depends on the Connector interface, not on any specific provider.
 */
export interface Connector {
  source: string; // matches LoopSpec.sensors keys + Signal.source
  label: string;
  /** True when the credentials this connector needs are present in env. */
  configured(): boolean;
  /** Pull the most recent signals (newest first). Returns [] on any failure. */
  read(limit: number): Promise<Signal[]>;
  /** Optional write action for the tools layer (draft/create/send/...). */
  write?(verb: string, desc: string, dryRun: boolean): Promise<ToolOutcome>;
  /** One-line reason shown when not configured. */
  note: string;
}

export interface ConnectorStatus {
  source: string;
  label: string;
  configured: boolean;
  note: string;
}

/** Trimmed env var, or "" if unset/blank. */
export function env(name: string): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : "";
}

/** First non-empty env var among names. */
export function envAny(...names: string[]): string {
  for (const n of names) {
    const v = env(n);
    if (v) return v;
  }
  return "";
}
