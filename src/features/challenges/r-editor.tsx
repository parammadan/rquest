"use client";

import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  HighlightStyle,
  indentOnInput,
  indentUnit,
  StreamLanguage,
  syntaxHighlighting,
} from "@codemirror/language";
import { r } from "@codemirror/legacy-modes/mode/r";
import { EditorState } from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { useEffect, useRef } from "react";

const highlight = HighlightStyle.define([
  { tag: tags.comment, color: "#8390ab", fontStyle: "italic" },
  { tag: tags.string, color: "#34d399" },
  { tag: [tags.number, tags.bool, tags.atom], color: "#fbbf24" },
  { tag: tags.keyword, color: "#a78bfa" },
  { tag: tags.operator, color: "#fb7185" },
  { tag: [tags.standard(tags.name), tags.function(tags.variableName)], color: "#22d3ee" },
  { tag: tags.variableName, color: "#e9edf6" },
]);

const theme = EditorView.theme(
  {
    "&": { backgroundColor: "#060910", color: "#e9edf6", fontSize: "0.85rem", height: "100%" },
    ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
    ".cm-content": { padding: "12px 0", caretColor: "#22d3ee" },
    ".cm-gutters": { backgroundColor: "#060910", color: "#2a3656", border: "none" },
    ".cm-activeLine": { backgroundColor: "rgb(255 255 255 / 0.03)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#8390ab" },
    "&.cm-focused": { outline: "none" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "#22d3ee" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgb(167 139 250 / 0.28) !important",
    },
    ".cm-matchingBracket": { backgroundColor: "rgb(34 211 238 / 0.18)", outline: "none" },
  },
  { dark: true },
);

/**
 * R code editor (CodeMirror 6). Mod-Enter runs, Shift-Mod-Enter submits.
 * Tab indents; press Escape then Tab to move focus out of the editor.
 */
export function REditor({
  value,
  onChange,
  onRun,
  onSubmit,
  label,
  describedBy,
}: {
  value: string;
  onChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  label: string;
  describedBy?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const handlers = useRef({ onChange, onRun, onSubmit });

  useEffect(() => {
    handlers.current = { onChange, onRun, onSubmit };
  });

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          indentOnInput(),
          bracketMatching(),
          indentUnit.of("  "),
          EditorState.tabSize.of(2),
          StreamLanguage.define(r),
          syntaxHighlighting(highlight),
          theme,
          keymap.of([
            { key: "Mod-Enter", run: () => (handlers.current.onRun(), true) },
            { key: "Shift-Mod-Enter", run: () => (handlers.current.onSubmit(), true) },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          EditorView.contentAttributes.of({
            "aria-label": label,
            ...(describedBy ? { "aria-describedby": describedBy } : {}),
          }),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) handlers.current.onChange(u.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = v;
    return () => {
      v.destroy();
      view.current = null;
    };
    // The editor is created once; later `value` changes are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External replacement (e.g. "Reset code").
  useEffect(() => {
    const v = view.current;
    if (v && v.state.doc.toString() !== value) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } });
    }
  }, [value]);

  return <div ref={host} className="h-full min-h-[18rem]" data-testid="r-editor" />;
}
