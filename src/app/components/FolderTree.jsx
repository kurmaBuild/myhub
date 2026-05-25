// src/components/FolderTree.jsx
"use client";
import { Folder } from "lucide-react";

export default function FolderTree({ folders, onSelectFolder, activeFolderId }) {
  // ONLY get the top-level parent projects (where parentId is null)
  const rootProjects = folders.filter(f => f.parentId === null);

  return (
    <ul className="space-y-1 list-none p-0 m-0">
      {rootProjects.map(project => {
        const isActive = activeFolderId === project.id;

        return (
          <li key={project.id} className="list-none">
            <div
              onClick={() => onSelectFolder(project.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all duration-150 text-xs ${
                isActive 
                  ? "bg-zinc-900 border border-zinc-800 text-teal-400 font-medium shadow-md shadow-black/40" 
                  : "text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200 border border-transparent"
              }`}
            >
              <Folder className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-teal-400" : "text-zinc-500"}`} />
              <span className="truncate tracking-wide">{project.name}</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}