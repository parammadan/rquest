"use client";

import { useSyncExternalStore } from "react";
import { rSession, type SessionState } from "./r-session";

const SERVER_STATE: SessionState = { status: "idle", detail: null, rVersion: null };

export function useRSession(): SessionState {
  return useSyncExternalStore(rSession.subscribe, rSession.getState, () => SERVER_STATE);
}
