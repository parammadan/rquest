/**
 * Read-only R code display with lightweight syntax colouring.
 * Tokenises into React elements (no innerHTML). Used for read-only previews.
 */
const KEYWORDS = new Set([
  "function", "if", "else", "for", "while", "repeat", "return", "library", "TRUE", "FALSE",
  "NULL", "NA", "in", "next", "break",
]);

const TOKEN = /(#[^\n]*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?(?:e-?\d+)?\b)|([A-Za-z_.][\w.]*)(?=\s*\()|([A-Za-z_.][\w.]*)|(<-|\|>|::|==|!=|<=|>=|[-+*/^<>=!&|$~:])/g;

function highlight(line: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [text, comment, str, num, fn, ident, op] = m;
    let cls = "";
    if (comment) cls = "text-fg-subtle italic";
    else if (str) cls = "text-emerald";
    else if (num) cls = "text-gold";
    else if (fn) cls = KEYWORDS.has(fn) ? "text-violet" : "text-cyan";
    else if (ident) cls = KEYWORDS.has(ident) ? "text-violet" : "";
    else if (op) cls = "text-coral";
    out.push(
      cls ? (
        <span key={k++} className={cls}>
          {text}
        </span>
      ) : (
        text
      ),
    );
    last = m.index + text.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function RCode({ code, filename }: { code: string; filename: string }) {
  const lines = code.split("\n");
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-[#060910]">
      <figcaption className="flex items-center gap-2 border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-coral/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-gold/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald/60" />
        </span>
        <span className="ml-2 font-mono text-xs text-fg-muted">{filename}</span>
        <span className="ml-auto rounded-md bg-white/[0.05] px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-fg-subtle">
          Read-only preview
        </span>
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-6" tabIndex={0} aria-label={`${filename} starter code`}>
        <code>
          {lines.map((line, i) => (
            <span key={i} className="block">
              <span aria-hidden="true" className="mr-4 inline-block w-5 select-none text-right text-ink-600">
                {i + 1}
              </span>
              {highlight(line)}
            </span>
          ))}
        </code>
      </pre>
    </figure>
  );
}
