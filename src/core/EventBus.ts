// EventBus.ts - Simple pub/sub for game events
import type { GameEvent } from '../types';

type EventHandler<T extends GameEvent = GameEvent> = (event: T) => void;
type EventType = GameEvent['type'];

/**
 * Simple pub/sub event bus for decoupled game event communication.
 * Allows game systems to communicate without direct dependencies.
 */
export class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();
  private globalHandlers: Set<EventHandler> = new Set();

  /**
   * Subscribe to a specific event type.
   * @param eventType The type of event to listen for
   * @param handler Function to call when event is emitted
   * @returns Unsubscribe function
   */
  on<T extends GameEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlers = this.handlers.get(eventType);
    handlers?.add(handler as EventHandler);

    return () => {
      handlers?.delete(handler as EventHandler);
    };
  }

  /**
   * Subscribe to all events (useful for logging/debugging).
   * @param handler Function to call for any event
   * @returns Unsubscribe function
   */
  onAny(handler: EventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => {
      this.globalHandlers.delete(handler);
    };
  }

  /**
   * Subscribe to an event type, but only trigger once.
   * @param eventType The type of event to listen for
   * @param handler Function to call when event is emitted
   * @returns Unsubscribe function (in case you want to cancel before it fires)
   */
  once<T extends GameEvent>(
    eventType: T['type'],
    handler: EventHandler<T>
  ): () => void {
    const unsubscribe = this.on(eventType, (event) => {
      unsubscribe();
      handler(event as T);
    });
    return unsubscribe;
  }

  /**
   * Emit an event to all registered handlers.
   * @param event The event to emit
   */
  emit(event: GameEvent): void {
    // Notify specific handlers
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }

    // Notify global handlers
    for (const handler of this.globalHandlers) {
      handler(event);
    }
  }

  /**
   * Remove all handlers for a specific event type.
   * @param eventType The event type to clear handlers for
   */
  off(eventType: EventType): void {
    this.handlers.delete(eventType);
  }

  /**
   * Remove all handlers (useful for cleanup/reset).
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers.clear();
  }

  /**
   * Check if any handlers are registered for an event type.
   */
  hasHandlers(eventType: EventType): boolean {
    const handlers = this.handlers.get(eventType);
    return (handlers !== undefined && handlers.size > 0) || this.globalHandlers.size > 0;
  }
}

// Singleton instance for global game events
export const gameEventBus = new EventBus();
