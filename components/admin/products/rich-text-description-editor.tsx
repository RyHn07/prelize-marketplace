"use client";

import { useEffect, useRef, useState } from "react";

import { sanitizeRichTextHtml } from "@/lib/rich-text";

type RichTextDescriptionEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onRequestImage?: () => void;
  imageToInsert?: string | null;
};

type EditorCommand = "bold" | "italic" | "insertUnorderedList" | "insertOrderedList";
type ActiveBlock = "blockquote" | "h2" | "h3" | "p" | null;

type ActiveFormats = {
  block: ActiveBlock;
  bold: boolean;
  italic: boolean;
  link: boolean;
  image: boolean;
  orderedList: boolean;
  unorderedList: boolean;
};

const EMPTY_ACTIVE_FORMATS: ActiveFormats = {
  block: null,
  bold: false,
  italic: false,
  link: false,
  image: false,
  orderedList: false,
  unorderedList: false,
};

type LinkDialogState = {
  error: string;
  mode: "link" | "youtube";
  value: string;
};

function IconListBullets() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M6.25 4.25H14M6.25 8.5H14M6.25 12.75H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 4.25H3.01M3 8.5H3.01M3 12.75H3.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconListNumbers() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M7 4.25H14M7 8.5H14M7 12.75H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2.75 5.35H4.35M3.55 5.35V2.95L2.9 3.35M2.75 7.75H4.35L2.75 10.05H4.35M2.75 12.05H4.3L3.45 13.05C4.05 13.05 4.45 13.35 4.45 13.85C4.45 14.35 4.05 14.65 3.4 14.65H2.75" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconQuote() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M5.25 7.35H3.35C3.45 5.55 4.2 4.55 5.65 3.85M12.2 7.35H10.3C10.4 5.55 11.15 4.55 12.6 3.85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.35 7.35H6.2V11.4H3.35V7.35ZM10.3 7.35H13.15V11.4H10.3V7.35Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M7.4 10.1L9.6 7.9M6.65 6.35L7.35 5.65C8.45 4.55 10.25 4.55 11.35 5.65C12.45 6.75 12.45 8.55 11.35 9.65L10.65 10.35M10.35 10.65L9.65 11.35C8.55 12.45 6.75 12.45 5.65 11.35C4.55 10.25 4.55 8.45 5.65 7.35L6.35 6.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M3.25 4.25C3.25 3.7 3.7 3.25 4.25 3.25H12.75C13.3 3.25 13.75 3.7 13.75 4.25V12.75C13.75 13.3 13.3 13.75 12.75 13.75H4.25C3.7 13.75 3.25 13.3 3.25 12.75V4.25Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.25 11.5L7.1 9.65L8.45 11L10.15 8.9L12.25 11.5M6.25 6.25H6.26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden="true">
      <path d="M3.25 5.25C3.25 4.7 3.7 4.25 4.25 4.25H10.25C10.8 4.25 11.25 4.7 11.25 5.25V11.75C11.25 12.3 10.8 12.75 10.25 12.75H4.25C3.7 12.75 3.25 12.3 3.25 11.75V5.25Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.25 7.2L13.75 5.75V12.25L11.25 10.8V7.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getYoutubeEmbedUrl(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);

    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (url.hostname === "youtube.com" || url.hostname === "www.youtube.com" || url.hostname === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) {
        return `https://www.youtube.com${url.pathname}`;
      }

      const id = url.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (url.hostname === "www.youtube-nocookie.com" && url.pathname.startsWith("/embed/")) {
      return `https://www.youtube-nocookie.com${url.pathname}`;
    }
  } catch {
    return null;
  }

  return null;
}

function ToolbarButton({
  active = false,
  children,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
      className={
        active
          ? "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-[#615FFF]/50 bg-[#615FFF]/10 px-2 text-xs font-semibold text-[#615FFF] shadow-sm transition-colors"
          : "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-gray-200 bg-white px-2 text-xs font-semibold text-gray-700 transition-colors hover:border-[#615FFF]/40 hover:bg-[#615FFF]/5 hover:text-[#615FFF]"
      }
    >
      {children}
    </button>
  );
}

function getSelectionElement(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const node = selection.anchorNode;
  const element = node instanceof HTMLElement ? node : node?.parentElement ?? null;

  if (!element || !editor.contains(element)) {
    return null;
  }

  return element;
}

function findClosestWithinEditor(element: HTMLElement, editor: HTMLElement, selector: string) {
  const closest = element.closest(selector);

  return closest instanceof HTMLElement && editor.contains(closest) ? closest : null;
}

export default function RichTextDescriptionEditor({
  value,
  onChange,
  onRequestImage,
  imageToInsert,
}: RichTextDescriptionEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const insertedImageRef = useRef<string | null>(null);
  const latestValueRef = useRef(value);
  const savedRangeRef = useRef<Range | null>(null);
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(EMPTY_ACTIVE_FORMATS);
  const [dialogState, setDialogState] = useState<LinkDialogState | null>(null);

  useEffect(() => {
    latestValueRef.current = value;

    if (!editorRef.current || editorRef.current.innerHTML === value) {
      return;
    }

    editorRef.current.innerHTML = value;
  }, [value]);

  useEffect(() => {
    const nextImage = imageToInsert?.trim();

    if (!nextImage || insertedImageRef.current === nextImage) {
      return;
    }

    insertedImageRef.current = nextImage;
    focusEditor();
    document.execCommand("insertHTML", false, `<p><img src="${escapeHtmlAttribute(nextImage)}" alt=""></p>`);
    syncFromEditor();
  }, [imageToInsert]);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const handleSelectionUpdate = () => {
      updateActiveFormats();
    };

    document.addEventListener("selectionchange", handleSelectionUpdate);
    editor.addEventListener("keyup", handleSelectionUpdate);
    editor.addEventListener("mouseup", handleSelectionUpdate);
    editor.addEventListener("focus", handleSelectionUpdate);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionUpdate);
      editor.removeEventListener("keyup", handleSelectionUpdate);
      editor.removeEventListener("mouseup", handleSelectionUpdate);
      editor.removeEventListener("focus", handleSelectionUpdate);
    };
  }, []);

  function updateActiveFormats() {
    const editor = editorRef.current;

    if (!editor) {
      setActiveFormats(EMPTY_ACTIVE_FORMATS);
      return;
    }

    const element = getSelectionElement(editor);

    if (!element) {
      setActiveFormats(EMPTY_ACTIVE_FORMATS);
      return;
    }

    const blockElement = findClosestWithinEditor(element, editor, "h2,h3,blockquote,p,div,li");
    const blockTag = blockElement?.tagName.toLowerCase();
    const listElement = findClosestWithinEditor(element, editor, "ul,ol");
    const imageElement =
      element.tagName.toLowerCase() === "img"
        ? element
        : findClosestWithinEditor(element, editor, "img");

    setActiveFormats({
      block:
        blockTag === "h2" || blockTag === "h3" || blockTag === "blockquote"
          ? blockTag
          : "p",
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      link: Boolean(findClosestWithinEditor(element, editor, "a")),
      image: Boolean(imageElement),
      orderedList: listElement?.tagName.toLowerCase() === "ol",
      unorderedList: listElement?.tagName.toLowerCase() === "ul",
    });
  }

  function saveSelectionRange() {
    const editor = editorRef.current;
    const selection = window.getSelection();

    if (!editor || !selection || selection.rangeCount === 0) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreSelectionRange() {
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = savedRangeRef.current;

    if (!editor || !selection || !range || !editor.contains(range.commonAncestorContainer)) {
      focusEditor();
      return;
    }

    selection.removeAllRanges();
    selection.addRange(range);
  }

  const refreshActiveFormatsSoon = () => {
    window.requestAnimationFrame(() => {
      updateActiveFormats();
    });
  };

  const syncFromEditor = () => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const nextValue = sanitizeRichTextHtml(editor.innerHTML);
    latestValueRef.current = nextValue;
    onChange(nextValue);
    updateActiveFormats();
  };

  const focusEditor = () => {
    editorRef.current?.focus();
  };

  const runCommand = (command: EditorCommand) => {
    focusEditor();
    document.execCommand(command);
    syncFromEditor();
    refreshActiveFormatsSoon();
  };

  const setBlock = (tagName: "p" | "h2" | "h3" | "blockquote") => {
    focusEditor();
    document.execCommand("formatBlock", false, tagName);
    syncFromEditor();
    refreshActiveFormatsSoon();
  };

  const addLink = () => {
    saveSelectionRange();
    setDialogState({ error: "", mode: "link", value: "" });
  };

  const addImage = () => {
    if (onRequestImage) {
      onRequestImage();
      return;
    }

    const url = window.prompt("Paste image URL");

    if (!url?.trim()) {
      return;
    }

    focusEditor();
    document.execCommand("insertHTML", false, `<p><img src="${escapeHtmlAttribute(url.trim())}" alt=""></p>`);
    syncFromEditor();
    refreshActiveFormatsSoon();
  };

  const addYoutubeEmbed = () => {
    saveSelectionRange();
    setDialogState({ error: "", mode: "youtube", value: "" });
  };

  const closeDialog = () => {
    setDialogState(null);
  };

  const submitDialog = () => {
    const value = dialogState?.value.trim() ?? "";

    if (!dialogState) {
      return;
    }

    if (!value) {
      setDialogState({ ...dialogState, error: "URL is required." });
      return;
    }

    restoreSelectionRange();

    if (dialogState.mode === "link") {
      document.execCommand("createLink", false, value);
      syncFromEditor();
      refreshActiveFormatsSoon();
      closeDialog();
      return;
    }

    const embedUrl = getYoutubeEmbedUrl(value);

    if (!embedUrl) {
      setDialogState({ ...dialogState, error: "Paste a valid YouTube URL." });
      return;
    }

    document.execCommand(
      "insertHTML",
      false,
      `<p><iframe src="${escapeHtmlAttribute(embedUrl)}" title="YouTube video" width="100%" height="360" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></p>`,
    );
    syncFromEditor();
    refreshActiveFormatsSoon();
    closeDialog();
  };

  const clearFormatting = () => {
    focusEditor();
    document.execCommand("removeFormat");
    syncFromEditor();
    refreshActiveFormatsSoon();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm focus-within:border-[#615FFF]/40 focus-within:ring-4 focus-within:ring-[#615FFF]/10">
      <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <ToolbarButton active={activeFormats.block === "p"} label="Paragraph" onClick={() => setBlock("p")}>
          P
        </ToolbarButton>
        <ToolbarButton active={activeFormats.block === "h2"} label="Title" onClick={() => setBlock("h2")}>
          H2
        </ToolbarButton>
        <ToolbarButton active={activeFormats.block === "h3"} label="Subtitle" onClick={() => setBlock("h3")}>
          H3
        </ToolbarButton>
        <ToolbarButton active={activeFormats.bold} label="Bold" onClick={() => runCommand("bold")}>
          B
        </ToolbarButton>
        <ToolbarButton active={activeFormats.italic} label="Italic" onClick={() => runCommand("italic")}>
          I
        </ToolbarButton>
        <ToolbarButton active={activeFormats.unorderedList} label="Bullet list" onClick={() => runCommand("insertUnorderedList")}>
          <IconListBullets />
        </ToolbarButton>
        <ToolbarButton active={activeFormats.orderedList} label="Numbered list" onClick={() => runCommand("insertOrderedList")}>
          <IconListNumbers />
        </ToolbarButton>
        <ToolbarButton active={activeFormats.block === "blockquote"} label="Quote" onClick={() => setBlock("blockquote")}>
          <IconQuote />
        </ToolbarButton>
        <ToolbarButton active={activeFormats.link} label="Link" onClick={addLink}>
          <IconLink />
        </ToolbarButton>
        <ToolbarButton active={activeFormats.image} label="Image" onClick={addImage}>
          <IconImage />
        </ToolbarButton>
        <ToolbarButton label="YouTube embed" onClick={addYoutubeEmbed}>
          <IconVideo />
        </ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={clearFormatting}>
          Clear
        </ToolbarButton>
      </div>
      <div
        ref={editorRef}
        id="preview-description"
        role="textbox"
        aria-label="Product description"
        contentEditable
        suppressContentEditableWarning
        onInput={syncFromEditor}
        onBlur={syncFromEditor}
        onClick={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        className="min-h-[220px] w-full px-4 py-3 text-sm leading-7 text-gray-800 outline-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)] [&_a]:text-[#615FFF] [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-4 [&_h2]:mb-3 [&_h2]:mt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_iframe]:my-5 [&_iframe]:block [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-lg [&_iframe]:border [&_iframe]:border-gray-200 [&_img]:my-5 [&_img]:block [&_img]:max-h-[420px] [&_img]:max-w-full [&_img]:rounded-lg [&_img]:border [&_img]:border-gray-200 [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-4 [&_p:has(img)]:my-6 [&_p:has(iframe)]:my-6 [&_strong]:font-semibold [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
        data-placeholder="Write product title, description, benefits, sizing notes, and paste image URLs from the media library..."
      />
      {dialogState ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-5">
              <h3 className="text-base font-semibold text-slate-900">
                {dialogState.mode === "link" ? "Add Link" : "Add YouTube Video"}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {dialogState.mode === "link"
                  ? "Paste the URL for the selected text."
                  : "Paste a YouTube watch, short, or embed URL."}
              </p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <label htmlFor="rich-text-url-input" className="block text-sm font-medium text-slate-700">
                URL
              </label>
              <input
                id="rich-text-url-input"
                autoFocus
                value={dialogState.value}
                onChange={(event) => setDialogState({ ...dialogState, error: "", value: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    submitDialog();
                  }

                  if (event.key === "Escape") {
                    event.preventDefault();
                    closeDialog();
                  }
                }}
                placeholder={dialogState.mode === "link" ? "https://example.com" : "https://www.youtube.com/watch?v=..."}
                className="h-11 w-full rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-[#615FFF] focus:ring-4 focus:ring-[#615FFF]/10"
              />
              {dialogState.error ? <p className="text-sm font-medium text-rose-600">{dialogState.error}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeDialog}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitDialog}
                className="inline-flex items-center justify-center rounded-lg bg-[#615FFF] px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {dialogState.mode === "link" ? "Add link" : "Add video"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
