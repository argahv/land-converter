import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during prerender and hydration, true afterwards — for purely decorative client-only output. */
export const useIsClient = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
