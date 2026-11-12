/**
 * Active time on a challenge: time the page is visible and focused while the learner
 * has interacted within the last IDLE_AFTER_MS. Pure (clock injected) so it's testable.
 */
export const IDLE_AFTER_MS = 60_000;
/** Gaps longer than this between ticks (sleep, throttled tab) count as at most this much. */
const MAX_TICK_MS = 5_000;

export class ActiveTimeMeter {
  private active = 0;
  private lastTick: number;
  private lastInput: number;

  constructor(now: number) {
    this.lastTick = now;
    this.lastInput = now;
  }

  /** Advance the clock. `attending` = page visible and focused. */
  tick(now: number, attending: boolean) {
    const dt = Math.max(0, Math.min(MAX_TICK_MS, now - this.lastTick));
    if (attending && now - this.lastInput <= IDLE_AFTER_MS) this.active += dt;
    this.lastTick = now;
  }

  /** The learner typed, clicked, or scrolled. */
  input(now: number, attending: boolean) {
    this.tick(now, attending);
    this.lastInput = now;
  }

  /** Active milliseconds since the last take() (or construction); resets the count. */
  take(now: number, attending: boolean): number {
    this.tick(now, attending);
    const ms = this.active;
    this.active = 0;
    return ms;
  }
}
