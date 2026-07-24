import { supabase } from '../supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

type Handler = (row: Record<string, unknown>) => void;

const handlers: Record<string, Handler> = {};

export function registerDomainEventHandler(eventType: string, fn: Handler): void {
  handlers[eventType] = fn;
}

let channel: RealtimeChannel | null = null;

export function startDomainEventConsumer(): RealtimeChannel {
  if (channel) return channel; // StrictMode / re-mount guard
  channel = supabase
    .channel('domain-events')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'domain_event' },
      (payload) => {
        const row = payload.new as { event_type?: string };
        const fn = row?.event_type ? handlers[row.event_type] : undefined;
        if (fn) fn(payload.new as Record<string, unknown>);
      },
    ) // .on() must come BEFORE .subscribe()
    .subscribe();
  return channel;
}

export function stopDomainEventConsumer(): void {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
}
