"use client";

import { useState, useEffect, useRef } from "react";
import { Search, FileText, Table, Link2, Folder, CornerDownRight } from "lucide-react";

export default function CommandPalette({ isOpen, onClose, folders, files, onSelectFolder }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredFolders = query === "" ? [] : folders.filter(f => 
    f.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);

  const filteredFiles = query === "" ? [] : files.filter(f => 
    f.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-md select-none animate-fade-in">
      <div className="w-full max-w-xl bg-[#0c0c0e] border border-zinc-900 rounded-2xl shadow-2xl shadow-black overflow-hidden">
        
        {/* Input Input Box */}
        <div className="flex items-center gap-3.5 px-4 py-3.5 border-b border-zinc-900 bg-zinc-950/40">
          <Search className="w-4 h-4 text-zinc-600" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Query workspace indexing metadata maps... (Esc to close)"
            className="flex-1 bg-transparent border-0 text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-0 text-xs font-sans tracking-wide cursor-text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* dropdown results context map */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3 scrollbar-none">
          {query === "" && (
            <p className="text-[10px] font-mono text-zinc-600 text-center py-6 uppercase tracking-wider animate-pulse">Awaiting matrix search string initialization...</p>
          )}

          {query !== "" && filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <p className="text-[10px] font-mono text-zinc-600 text-center py-6 uppercase tracking-wider">No workspace vectors found.</p>
          )}

          {/* Folders List Output */}
          {filteredFolders.length > 0 && (
            <div className="space-y-1">
              <span className="px-3 text-[9px] font-extrabold text-zinc-600 uppercase tracking-[0.15em] font-mono block">Matching Spaces</span>
              <div className="space-y-0.5">
                {filteredFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => { onSelectFolder(folder.id); onClose(); setQuery(""); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all duration-150 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Folder className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="font-mono tracking-wide uppercase text-[11px]">{folder.name}</span>
                    </div>
                    <span className="text-[9px] font-mono text-teal-500 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity uppercase font-bold">
                      Route Space <CornerDownRight className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files List Output */}
          {filteredFiles.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="px-3 text-[9px] font-extrabold text-zinc-600 uppercase tracking-[0.15em] font-mono block">Managed Documents</span>
              <div className="space-y-0.5">
                {filteredFiles.map(file => (
                  <a
                    key={file.id}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => { onClose(); setQuery(""); }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all duration-150 group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {file.type === "google_doc" && <FileText className="w-3.5 h-3.5 text-sky-400" />}
                      {file.type === "google_sheet" && <Table className="w-3.5 h-3.5 text-emerald-400" />}
                      {file.type === "external_link" && <Link2 className="w-3.5 h-3.5 text-amber-400" />}
                      <span className="truncate tracking-wide flex-1 font-sans">{file.name}</span>
                    </div>
                    <span className="text-[8px] font-mono bg-zinc-950 px-1.5 py-0.5 border border-zinc-900 text-zinc-600 rounded uppercase font-bold">Open</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}