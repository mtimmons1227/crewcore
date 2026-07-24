import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

type HandlerFn = (payload: Record<string, unknown>) => void | Promise<void>;

const handlers = new Map<string, HandlerFn[]>();

export function registerHandler(eventType: string, fn: HandlerFn): void {
  const existing = handlers.get(eventType) ?? [];
  handlers.set(eventType, [...existing, fn]);
}

export function startDomainEventConsumer(supabase: SupabaseClient<Database>): void {
  supabase
    .channel('domain-events')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'domain_event' },
      (change) => {
        const row = change.new as { event_type: string; payload: Record<string, unknown> };
        const fns = handlers.get(row.event_type) ?? [];
        for (const fn of fns) {
          Promise.resolve(fn(row.payload)).catch(console.error);
        }
      }
    )
    .subscribe();
}
