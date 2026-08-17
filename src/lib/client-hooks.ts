"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * `true` solo después de hidratar en el cliente. Se implementa con
 * `useSyncExternalStore` (y no con `setState` en un efecto) para no disparar
 * renders en cascada.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/** Reloj compartido: un solo `setInterval` para todos los suscriptores. */
function createClock(intervalMs: number) {
  let value = Date.now();
  let timer: ReturnType<typeof setInterval> | null = null;
  const listeners = new Set<() => void>();

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      if (timer === null) {
        value = Date.now();
        timer = setInterval(() => {
          value = Date.now();
          for (const l of listeners) l();
        }, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    snapshot: () => value,
  };
}

const secondClock = createClock(1000);

/**
 * Marca de tiempo que avanza cada segundo en el cliente. En el servidor
 * devuelve `null` para que el render inicial no dependa del reloj.
 */
export function useNow(): number | null {
  return useSyncExternalStore(
    secondClock.subscribe,
    secondClock.snapshot,
    () => null,
  );
}
