"use client";

import { useState } from "react";
import { X, Link2 } from "lucide-react";

export default function LinkAssetModal({ isOpen, onClose, onLinkAdded }) {
  const [url, setUrl] = useState("");
  const [customName, setCustomName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!url) return;

    let type = "external_link";
    let calculatedName = customName || "Linked Asset Reference";

    if (url.includes("docs.google.com/document")) {
      type = "google_doc";
      if (!customName) calculatedName = "Linked Google Document";
    } else if (url.includes("docs.google.com/spreadsheet")) {
      type = "google_sheet";
      if (!customName) calculatedName = "Linked Google Spreadsheet";
    }

    onLinkAdded({
      id: `linked-${Date.now()}`,
      name: calculatedName,
      type: type,
      url: url,
    });

    setUrl("");
    setCustomName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-[#0c0c0e] border border-zinc-900 rounded-2xl shadow-2xl p-5 overflow-hidden">
        
        {/* Modal Title Row */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-5">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300">Connect Subspace Asset Reference</h3>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-400 p-1 rounded-xl hover:bg-zinc-900/60 transition-all duration-200 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Parameters Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          <div className="space-y-1.5">
            <label className="block text-[9px] font-extrabold font-mono uppercase text-zinc-500 tracking-[0.15em] pl-0.5">Resource Socket URL</label>
            <input
              type="url"
              required
              placeholder="https://docs.google.com/... or external asset reference"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-0 font-mono tracking-wide cursor-text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[9px] font-extrabold font-mono uppercase text-zinc-500 tracking-[0.15em] pl-0.5">Display Token Alias (Optional)</label>
            <input
              type="text"
              placeholder="e.g., Master System Schematics Canvas"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 focus:border-zinc-800 rounded-xl text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none focus:ring-0 tracking-wide cursor-text"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl transition-all duration-200 mt-2 shadow-md shadow-black/40 cursor-pointer"
          >
            Bind Context Reference Token
          </button>
        </form>
      </div>
    </div>
  );
}