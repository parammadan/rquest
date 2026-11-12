/**
 * One shared R session per browser tab, powered by webR (R compiled to
 * WebAssembly, running in a Web Worker). Learner code never touches the page:
 * it runs inside the worker, and only text crosses back.
 *
 * - Loaded lazily from the official webR CDN, pinned to one version.
 * - Jobs are serialised; each has a wall-clock timeout. A runaway job (e.g. an
 *   infinite loop) is handled by discarding the worker and starting fresh.
 */
import type { EvaluationResult, ValidatorDefinition } from "@/domain/evaluation";
import { interpretVerdicts } from "@/domain/evaluation";
import { R_HARNESS } from "./harness";

export const WEBR_VERSION = "0.6.0";
const WEBR_BASE = `https://webr.r-wasm.org/v${WEBR_VERSION}/`;

/* ----------------------- minimal webR surface ----------------------- */

interface RObj {
  toJs(): Promise<unknown>;
  get(name: string): Promise<RObj>;
}
interface CaptureOutput {
  type: string;
  data: unknown;
}
interface ShelterLike {
  evalR(code: string, opts?: Record<string, unknown>): Promise<RObj>;
  captureR(code: string, opts?: Record<string, unknown>): Promise<{ output: CaptureOutput[] }>;
  purge(): Promise<void>;
}
interface WebRLike {
  init(): Promise<unknown>;
  close(): void;
  versionR: string;
  evalRVoid(code: string): Promise<void>;
  evalRBoolean(code: string): Promise<boolean>;
  installPackages(pkgs: string[], opts?: { quiet?: boolean; mount?: boolean }): Promise<void>;
  objs: { globalEnv: { bind(name: string, value: unknown): Promise<void> } };
  Shelter: new () => Promise<ShelterLike>;
}

/* ------------------------------ state ------------------------------ */

export type SessionStatus = "idle" | "starting" | "ready" | "running" | "installing" | "failed";

export interface SessionState {
  status: SessionStatus;
  detail: string | null;
  rVersion: string | null;
}

export interface ConsoleLine {
  kind: "stdout" | "stderr" | "message" | "warning" | "error" | "system";
  text: string;
}

export interface RunResult {
  lines: ConsoleLine[];
  timedOut: boolean;
  durationMs: number;
}

class TimeoutError extends Error {}

const PKG_NAME = /^[A-Za-z][A-Za-z0-9.]*$/;

async function messageOf(data: unknown): Promise<string> {
  try {
    const msg = await (data as RObj).get("message");
    const js = (await msg.toJs()) as { values?: unknown[] };
    return String(js.values?.[0] ?? "").trim();
  } catch {
    return String(data ?? "");
  }
}

export class RSession {
  private webR: WebRLike | null = null;
  private starting: Promise<WebRLike> | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private state: SessionState = { status: "idle", detail: null, rVersion: null };
  private listeners = new Set<() => void>();
  private installed = new Set<string>();

  getState = () => this.state;

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  };

  private set(status: SessionStatus, detail: string | null = null) {
    this.state = { status, detail, rVersion: this.webR?.versionR ?? this.state.rVersion };
    this.listeners.forEach((l) => l());
  }

  /** Start R (downloads the WebAssembly build on first use). */
  start(): Promise<WebRLike> {
    if (this.webR) return Promise.resolve(this.webR);
    if (this.starting) return this.starting;
    this.set("starting", "Downloading R for WebAssembly…");
    this.starting = (async () => {
      try {
        const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${WEBR_BASE}webr.mjs`)) as {
          WebR: new (opts: Record<string, unknown>) => WebRLike;
        };
        const webR = new mod.WebR({ baseUrl: WEBR_BASE, interactive: false });
        await webR.init();
        this.set("starting", "Preparing the RQuest workspace…");
        await webR.evalRVoid(R_HARNESS);
        this.webR = webR;
        this.installed.clear();
        this.set("ready");
        return webR;
      } catch (e) {
        this.set("failed", `R could not start: ${e instanceof Error ? e.message : String(e)}`);
        throw e;
      } finally {
        this.starting = null;
      }
    })();
    return this.starting;
  }

  /** Discard the worker (used after a timeout). The next job starts fresh. */
  private discard(reason: string) {
    try {
      this.webR?.close();
    } catch {
      /* already gone */
    }
    this.webR = null;
    this.installed.clear();
    this.set("idle", reason);
  }

  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async ensurePackages(webR: WebRLike, packages: string[]) {
    for (const p of packages) {
      if (!PKG_NAME.test(p) || this.installed.has(p)) continue;
      const has = await webR.evalRBoolean(`requireNamespace("${p}", quietly = TRUE)`);
      if (!has) {
        this.set("installing", `Installing ${p} (one-time download)…`);
        await webR.installPackages([p], { quiet: true });
      }
      this.installed.add(p);
    }
  }

  private async timed<T>(work: Promise<T>, ms: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new TimeoutError()), ms);
    });
    try {
      return await Promise.race([work, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** Run code like an R console (autoprint), with the challenge's setup loaded. */
  run(code: string, opts: { setup: string; packages: string[]; timeoutMs: number }): Promise<RunResult> {
    return this.enqueue(async () => {
      const webR = await this.start();
      await this.ensurePackages(webR, opts.packages);
      this.set("running");
      const t0 = performance.now();
      const shelter = await new webR.Shelter();
      try {
        const lines = await this.timed(
          (async () => {
            await webR.objs.globalEnv.bind(".rq_setup", opts.setup);
            const env = await shelter.evalR(".rquest$prepare(.rq_setup)");
            const cap = await shelter.captureR(code, {
              env,
              withAutoprint: true,
              captureStreams: true,
              captureConditions: true,
              captureGraphics: false,
              throwJsException: false,
            });
            const out: ConsoleLine[] = [];
            for (const o of cap.output) {
              if (o.type === "stdout" || o.type === "stderr") out.push({ kind: o.type, text: String(o.data) });
              else if (o.type === "message" || o.type === "warning" || o.type === "error")
                out.push({ kind: o.type, text: await messageOf(o.data) });
            }
            return out;
          })(),
          opts.timeoutMs,
        );
        this.set("ready");
        return { lines, timedOut: false, durationMs: performance.now() - t0 };
      } catch (e) {
        if (e instanceof TimeoutError) {
          this.discard("The last run was stopped after the time limit. R will restart on the next run.");
          return {
            lines: [{ kind: "error", text: `Stopped after ${opts.timeoutMs / 1000}s — check for an infinite loop. R has been restarted.` }],
            timedOut: true,
            durationMs: performance.now() - t0,
          };
        }
        this.set("ready");
        const msg = e instanceof Error ? e.message : String(e);
        return { lines: [{ kind: "error", text: msg.replace(/^Error:\s*/, "") }], timedOut: false, durationMs: performance.now() - t0 };
      } finally {
        if (this.webR) await shelter.purge().catch(() => undefined);
      }
    });
  }

  /** Run the learner's code, then every hidden check. Returns verdicts only. */
  validate(code: string, def: ValidatorDefinition, packages: string[]): Promise<EvaluationResult> {
    return this.enqueue(async () => {
      let webR: WebRLike;
      try {
        webR = await this.start();
        await this.ensurePackages(webR, packages);
      } catch (e) {
        return { status: "runtime-error", message: e instanceof Error ? e.message : String(e) };
      }
      this.set("running", "Validating…");
      const shelter = await new webR.Shelter();
      try {
        const raw = await this.timed(
          (async () => {
            await webR.objs.globalEnv.bind(".rq_code", code);
            await webR.objs.globalEnv.bind(".rq_setup", def.setup);
            await webR.objs.globalEnv.bind(".rq_checks", def.checks.map((c) => c.expr));
            const res = await shelter.evalR(".rquest$validate(.rq_code, .rq_setup, .rq_checks)");
            const js = (await res.toJs()) as { values?: unknown[] };
            return (js.values ?? []).map(String);
          })(),
          def.timeoutMs,
        );
        this.set("ready");
        return interpretVerdicts(def, raw);
      } catch (e) {
        if (e instanceof TimeoutError) {
          this.discard("Validation was stopped after the time limit. R will restart on the next run.");
          return {
            status: "timeout",
            message: `Validation stopped after ${def.timeoutMs / 1000}s — check for an infinite loop or very slow code.`,
          };
        }
        this.set("ready");
        return { status: "runtime-error", message: e instanceof Error ? e.message : String(e) };
      } finally {
        if (this.webR) await shelter.purge().catch(() => undefined);
      }
    });
  }
}

/** The tab-wide session. */
export const rSession = new RSession();
