"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import CommandPalette from "@/components/CommandPalette";
import LinkAssetModal from "@/components/LinkAssetModal";
import {
  FileText, Table, Link2, Plus, Search, Terminal,
  ArrowUpRight, LayoutGrid, Folder, ChevronRight,
  PanelLeftClose, PanelLeft, FolderPlus, Loader2, HelpCircle,
  Trash2, Edit3, CheckSquare, Square, X, ExternalLink, Download, Columns
} from "lucide-react";

export default function Dashboard() {
  const { data: session, status } = useSession();

  // --- Live Cloud Synchronized States ---// Set clean, un-hydrated arrays as baseline states
  const [folderStructureList, setFolderStructureList] = useState([]);
  const [filesList, setFilesList] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);

  // --- UI Layout Controllers ---
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hubMissingAlert, setHubMissingAlert] = useState(false);

  // --- In-Line System Feedback Loaders ---
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [isCreatingDoc, setIsCreatingDoc] = useState(false);

  // --- Feature 1 States: Telemetry Logs & Terminal ---
  const [terminalLogs, setTerminalLogs] = useState([
    { id: 1, text: "MAIN_INIT: System interface ready.", type: "sys" }
  ]);
  const [isTerminalExpanded, setIsTerminalExpanded] = useState(false);
  const logTerminalEndRef = useRef(null);

  // --- Feature 2 States: Structural Metadata Sidebar Drawer ---
  const [editingAsset, setEditingAsset] = useState(null);
  const [newMetadataName, setNewMetadataName] = useState("");
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);

  // --- Feature 3 States: Asset Filter Mask ---
  const [activeFilterMask, setActiveFilterMask] = useState("ALL");

  // --- Feature 4 States: Bulk Multi-Select Selection Matrix ---
  const [selectedFileIds, setSelectedFileIds] = useState([]);

  // --- NEW ADDITIONS: Tab Context Workspace System ---
  const [tabs, setTabs] = useState([
    { id: "tab_default", label: "myhub root", activeFolderId: null }
  ]);
  const [activeTabId, setActiveTabId] = useState("tab_default");

  // --- NEW ADDITIONS: Local-to-Cloud Drag & Drop Dropzone Overlay ---
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  // --- NEW ADDITIONS: Iron Man Helmet HUD Controller (Slightly Visible, Opens Automatically) ---
  const [isHudOpen, setIsHudOpen] = useState(true);

  const recordTelemetry = (message, statusType = "info") => {
    const stamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [...prev, { id: Date.now(), text: `[${stamp}] ${message}`, type: statusType }]);
  };

  useEffect(() => {
    if (logTerminalEndRef.current) {
      logTerminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // --- Global Keyboard Event Monitors (⌘K / Ctrl+K) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Feature 5: Hydrate Layout Indexes via persistent local cache stores ---
  useEffect(() => {
    const hydrateCachedStorage = () => {
      try {
        const cachedFolders = localStorage.getItem("myhub_cache_folders");
        const cachedFiles = localStorage.getItem("myhub_cache_files");
        if (cachedFolders && cachedFiles) {
          setFolderStructureList(JSON.parse(cachedFolders));
          setFilesList(JSON.parse(cachedFiles));
          setIsLoading(false);
          recordTelemetry("CACHE_HYDRATE: Local index mappings restored.", "info");
        }
      } catch (err) {
        console.error("Local recovery storage parse exception:", err);
      }
    };
    hydrateCachedStorage();
  }, []);

  // --- Sync Engine: Manifest Fetch Routine ---
  useEffect(() => {
    const fetchLiveHubData = async () => {
      if (status !== "authenticated") {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/get-drive-layout");
        const data = await res.json();

        if (data.success) {
          setFolderStructureList(data.folders || []);
          setFilesList(data.files || []);

          // Disable the missing alert since the backend handles it now
          setHubMissingAlert(false);

          if (data.autoProvisioned) {
            recordTelemetry("MASTER_GRID: No active workspace found. Seeded fresh root directory 'myhub' inside cloud storage.", "success");
          } else {
            recordTelemetry(`SYNC_SUCCESS: Loaded ${data.folders?.length || 0} sub-environments seamlessly.`, "success");
          }

          localStorage.setItem("myhub_cache_folders", JSON.stringify(data.folders || []));
          localStorage.setItem("myhub_cache_files", JSON.stringify(data.files || []));
        } else {
          recordTelemetry("FAIL: Direct data loop failed to return valid arrays.", "error");
        }
      } catch (err) {
        console.error("Could not sync live Drive assets:", err);
        setHubMissingAlert(true);
        recordTelemetry("NET_EXC: Transport layer interruption mapping workspace nodes.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveHubData();
  }, [status]);

  // --- Dynamic Runtime Mappings & Filter Implementations ---
  const currentFolder = folderStructureList.find(f => f.id === currentFolderId) || null;
  const subFolders = folderStructureList.filter(f => f.parentId === currentFolderId);

  const displayFiles = filesList.filter(f => {
    const isInActiveFolder = f.folderId === currentFolderId;
    if (!isInActiveFolder) return false;
    if (activeFilterMask === "DOCS") return f.type === "google_doc";
    if (activeFilterMask === "SHEETS") return f.type === "google_sheet";
    if (activeFilterMask === "LINKS") return f.type === "external_link";
    return true;
  });

  // Clear selections automatically when switching active folders
  useEffect(() => {
    setSelectedFileIds([]);
  }, [currentFolderId]);

  // --- Location Breadcrumb Tracer ---
  const buildBreadcrumbs = () => {
    const crumbs = [];
    let tracer = currentFolder;
    while (tracer) {
      crumbs.unshift(tracer);
      tracer = folderStructureList.find(f => f.id === tracer.parentId) || null;
    }
    return crumbs;
  };
  const breadcrumbs = buildBreadcrumbs();

  // --- NEW WORKSPACE TAB MANAGEMENT IMPLEMENTATION ---
  const handleSelectTab = (tabId, targetFolderId) => {
    setActiveTabId(tabId);
    setCurrentFolderId(targetFolderId);
    recordTelemetry(`TAB_SWITCH: Shifted context focus matrix to window ${tabId}`, "info");
  };

  const handleCreateNewTab = () => {
    const newTabId = `tab_${Date.now()}`;
    const activeFolderName = currentFolder ? currentFolder.name : "myhub root";
    setTabs(prev => [...prev, { id: newTabId, label: activeFolderName, activeFolderId: currentFolderId }]);
    setActiveTabId(newTabId);
    recordTelemetry("TAB_FORK: Cloned execution path pipeline into concurrent viewport tab.", "success");
  };

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const filteredTabs = tabs.filter(t => t.id !== tabId);
    setTabs(filteredTabs);
    if (activeTabId === tabId) {
      const fallbackTab = filteredTabs[filteredTabs.length - 1];
      setActiveTabId(fallbackTab.id);
      setCurrentFolderId(fallbackTab.activeFolderId);
    }
    recordTelemetry("TAB_DESTRUCTION: Disconnected context viewport array loop.", "info");
  };

  // Sync current selection tracking straight back to active tab metadata objects
  useEffect(() => {
    if (!currentFolderId) return;
    setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, label: currentFolder?.name || "myhub root", activeFolderId: currentFolderId } : t));
  }, [currentFolderId]);

  // --- NEW DRAG-AND-DROP PAYLOAD HANDLING OVERLAY ---
  const handleDragOverZone = (e) => {
    e.preventDefault();
    if (status === "authenticated" && currentFolderId) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeaveZone = () => {
    setIsDraggingOver(false);
  };

  // --- Memory Cache Flushing Loop on Session Expiration ---
  useEffect(() => {
    if (status === "unauthenticated") {
      // 1. Wipe React memory tracking pointers to clear the left tree view instantly
      setFolderStructureList([]);
      setFilesList([]);
      setSelectedFileIds([]);

      // 2. Clear out local browser storage nodes
      localStorage.removeItem("myhub_cache_folders");
      localStorage.removeItem("myhub_cache_files");

      recordTelemetry("SECURITY: Session terminated. Local tracking layout matrices flushed successfully.", "neutral");
    }
  }, [status]);

  const handleLogoutClick = async () => {
  // Clear layout caches instantly on click
  localStorage.removeItem("myhub_cache_folders");
  localStorage.removeItem("myhub_cache_files");
  setFolderStructureList([]);
  setFilesList([]);
  
  // Fire off NextAuth sign-out lifecycle routines
  await signOut({ callbackUrl: "/" });
};

  const handleDropPayload = async (e) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const incomingFiles = Array.from(e.dataTransfer.files);
    if (!incomingFiles.length || !currentFolderId) return;

    recordTelemetry(`DROPZONE: Intercepted ${incomingFiles.length} file streams for processing.`, "info");

    for (const localFile of incomingFiles) {
      setUploadProgress(`Streaming payload: ${localFile.name}...`);
      try {
        const payloadData = new FormData();
        payloadData.append("file", localFile);
        payloadData.append("parentId", currentFolderId);

        const res = await fetch("/api/upload-asset", { method: "POST", body: payloadData });
        const data = await res.json();

        if (data.success) {
          const freshCloudAsset = {
            id: data.fileId,
            name: localFile.name,
            type: localFile.type.includes("sheet") ? "google_sheet" : "external_link",
            folderId: currentFolderId,
            url: `https://drive.google.com/file/d/${data.fileId}/view`
          };
          setFilesList(prev => [freshCloudAsset, ...prev]);
          recordTelemetry(`UPLOAD: Broadcast file "${localFile.name}" successfully bound inside context.`, "success");
        } else {
          recordTelemetry(`UPLOAD_REJECTED: Remote API closed gate node -> ${data.error}`, "error");
        }
      } catch (err) {
        recordTelemetry("UPLOAD_EXC: Lost endpoint stream synchronization pipeline.", "error");
      }
    }
    setUploadProgress(null);
  };

  // --- NEW NATIVE RESOURCE DOWNLOADING EXPORT ENGINE ---
  const handleDirectDownloadPipe = async (file, e) => {
    e.stopPropagation();
    recordTelemetry(`DOWNLOAD: Initiating direct export binary fetch for asset node 0x${file.id.substring(0, 6)}...`, "info");
    try {
      const response = await fetch(`/api/download-asset?fileId=${file.id}&mimeType=${file.type}`);
      if (!response.ok) throw new Error("Internal binary channel negotiation fault.");

      const rawBlob = await response.blob();
      const internalLink = document.createElement("a");
      internalLink.href = window.URL.createObjectURL(rawBlob);
      internalLink.setAttribute("download", file.name);
      document.body.appendChild(internalLink);
      internalLink.click();
      internalLink.remove();
      recordTelemetry(`DOWNLOAD_SUCCESS: Compiled byte streams dumped to disk for: ${file.name}`, "success");
    } catch (err) {
      recordTelemetry(`DOWNLOAD_ERR: Pipeline error converting metadata block down to binary -> ${err.message}`, "error");
    }
  };

  // --- Bulk Selection Matrix Toggles ---
  const toggleSelectFile = (id, e) => {
    e.stopPropagation();
    setSelectedFileIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkOpenTabs = () => {
    const targetUrls = filesList.filter(f => selectedFileIds.includes(f.id)).map(f => f.url);
    recordTelemetry(`BULK_LAUNCH: Initializing threads for ${targetUrls.length} file mappings.`, "success");
    targetUrls.forEach(url => window.open(url, "_blank", "noopener,noreferrer"));
  };

  // --- File Metadata Modification Executions ---
  const handleOpenMetadataDrawer = (asset, e) => {
    e.stopPropagation();
    setEditingAsset(asset);
    setNewMetadataName(asset.name);
  };

  const handleUpdateAssetMetadata = async (e) => {
    e.preventDefault();
    if (!editingAsset || !newMetadataName.trim()) return;

    setIsUpdatingMetadata(true);
    recordTelemetry(`PATCH_TRANSACTION: Rewriting manifest identity metadata to "${newMetadataName}"...`, "info");

    try {
      setFolderStructureList(prev => prev.map(f => f.id === editingAsset.id ? { ...f, name: newMetadataName } : f));
      setFilesList(prev => prev.map(f => f.id === editingAsset.id ? { ...f, name: newMetadataName } : f));
      recordTelemetry(`SUCCESS: Node updated -> ${editingAsset.id.substring(0, 6)} initialized as "${newMetadataName}"`, "success");
      setEditingAsset(null);
    } catch (err) {
      recordTelemetry("METADATA_FAIL: Remapping transaction declined.", "error");
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  // --- Recursive Node Erasure & Trashing Routines ---
  const handleTrashAssetNode = async (asset, e) => {
    e.stopPropagation();
    const verificationPrompt = confirm(`Confirm structural purging sequence for node: "${asset.name}"?`);
    if (!verificationPrompt) return;

    recordTelemetry(`PURGE: Contacting cloud server to trash node ${asset.id.substring(0, 6)}...`, "info");

    try {
      const res = await fetch("/api/trash-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id }),
      });

      const data = await res.json();

      if (data.success) {
        setFolderStructureList(prev => prev.filter(f => f.id !== asset.id));
        setFilesList(prev => prev.filter(f => f.id !== asset.id));

        if (currentFolderId === asset.id) {
          setCurrentFolderId(null);
        }
        recordTelemetry(`PURGED: Node safely trashed inside Google Drive.`, "success");
      } else {
        alert(`Cloud Trash Failed: ${data.error}`);
        recordTelemetry(`FAILED: Google Drive API rejected deletion -> ${data.error}`, "error");
      }
    } catch (err) {
      console.error(err);
      alert("Network request timeout tracing trash channel.");
      recordTelemetry("TIMEOUT: Failed to broadcast deletion sequence to cloud service.", "error");
    }
  };

  // --- Workspace Cloud Orchestration Actions ---
  const handleCreateDocument = async () => {
    if (!currentFolderId) return;

    const docTitle = prompt("Enter a title name for your new Google Document:");
    if (!docTitle) return;

    setIsCreatingDoc(true);
    recordTelemetry(`MIME_GEN: Provisioning container segment allocation for "${docTitle}"...`, "info");
    try {
      const res = await fetch("/api/create-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docName: docTitle,
          parentId: currentFolderId
        }),
      });

      const data = await res.json();

      if (data.success) {
        const newFileObj = {
          id: data.id,
          name: data.name,
          type: "google_doc",
          folderId: currentFolderId,
          url: data.url
        };

        setFilesList(prev => [newFileObj, ...prev]);
        recordTelemetry(`BOUND: Created file asset index target -> ID 0x${data.id.substring(0, 6)}`, "success");
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        alert(`Creation Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network request timeout creating document assets.");
    } finally {
      setIsCreatingDoc(false);
    }
  };

  const handleLinkAssetAdded = (newAssetData) => {
    if (!currentFolderId) return;
    const fullyMappedAsset = {
      ...newAssetData,
      folderId: currentFolderId
    };
    setFilesList(prev => [fullyMappedAsset, ...prev]);
    recordTelemetry(`LINK_APPEND: External reference index tied to partition context -> "${newAssetData.name}"`, "success");
  };

  const handleCreateRootProject = async () => {
    const projectName = prompt("Enter a name for your new Root Project:");
    if (!projectName) return;

    setIsCreatingRoot(true);
    recordTelemetry(`DIR_ALLOC: Restructuring tree space. Allocating partition branch "${projectName}"...`, "info");
    try {
      const res = await fetch("/api/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderName: projectName }),
      });
      const data = await res.json();

      if (data.success) {
        const newFolderObj = {
          id: data.id,
          name: data.name,
          parentId: data.parentId
        };
        setFolderStructureList(prev => [...prev, newFolderObj]);
        setCurrentFolderId(data.id);
        recordTelemetry(`SUCCESS: Root array branch deployed successfully. Teleporting context focus.`, "success");
      } else {
        alert(`Folder Creation Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network exception communicating with cloud file services.");
    } finally {
      setIsCreatingRoot(false);
    }
  };

  const handleCreateNewFolder = async () => {
    if (!currentFolderId) return;

    const folderTitleName = prompt("Enter a name configuration for your new Subfolder directory:");
    if (!folderTitleName) return;

    setIsCreatingFolder(true);
    recordTelemetry(`SUB_ALLOC: Appending subdirectory map token "${folderTitleName}"...`, "info");
    try {
      const res = await fetch("/api/create-folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderName: folderTitleName,
          parentId: currentFolderId
        }),
      });
      const data = await res.json();

      if (data.success) {
        const newSubFolderObj = {
          id: data.id,
          name: data.name,
          parentId: currentFolderId
        };
        setFolderStructureList(prev => [...prev, newSubFolderObj]);
        recordTelemetry(`SUCCESS: Subfolder directory mapping complete.`, "success");
      } else {
        alert(`Subfolder Creation Failed: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Network exception creating nested subfolder configuration.");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // --- Immersive Boot Loader Terminal UI ---
  if (status === "loading" || isLoading) {
    return (
      <div className="w-screen h-screen bg-[#070708] flex flex-col items-center justify-center font-mono gap-4 select-none relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f12_1px,transparent_1px),linear-gradient(to_bottom,#0f0f12_1px,transparent_1px)] bg-[size:32px_32px] opacity-20"></div>
        <div className="relative flex items-center justify-center w-16 h-16 rounded-xl border border-zinc-800 bg-[#0c0c0e]/60 backdrop-blur-md shadow-2xl shadow-teal-500/10">
          <Loader2 className="w-8 h-8 text-teal-400 animate-spin absolute" style={{ animationDuration: '1s' }} />
          <Terminal className="w-4 h-4 text-zinc-400" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-bold">Initializing Mainframe</p>
          <p className="text-[9px] text-zinc-600 font-medium font-sans">Syncing myhub manifest nodes...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-screen h-screen bg-[#070708] text-zinc-200 overflow-hidden flex flex-col font-sans antialiased"
      onDragOver={handleDragOverZone}
    >
      <div className="flex-1 w-full flex overflow-hidden relative">

        <CommandPalette
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          folders={folderStructureList}
          files={filesList}
          onSelectFolder={setCurrentFolderId}
        />

        <LinkAssetModal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          onLinkAdded={handleLinkAssetAdded}
        />

        {/* --- Left Navigation Tree Panel --- */}
        <aside className={`h-full border-r border-zinc-900 bg-[#0c0c0e] flex flex-col shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${isSidebarOpen ? "w-64" : "w-0"}`}>
          <div className="p-4 flex flex-col h-full w-64 select-none">

            <div className="flex items-center gap-2.5 px-3 py-2.5 mb-5 border border-zinc-800/40 bg-zinc-900/10 rounded-xl backdrop-blur-sm">
              <Terminal className="w-4 h-4 text-teal-400 shrink-0" />
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-zinc-200 to-zinc-400 bg-clip-text text-transparent">Organizer</span>
            </div>

            <div className="flex items-center justify-between mb-3 px-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-zinc-500 font-mono">Workspace Tree</span>
              <button
                onClick={handleCreateRootProject}
                className="text-[10px] text-teal-400 hover:text-teal-300 font-bold px-2 py-1 rounded-lg hover:bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/40 transition-all duration-200 cursor-pointer flex items-center gap-1 shadow-sm shadow-teal-500/5"
              >
                <Plus className="w-2.5 h-2.5" /> Space
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-none">
              {folderStructureList.length === 0 && !isCreatingRoot ? (
                <div className="p-4 text-center border border-dashed border-zinc-900/60 rounded-xl bg-zinc-950/20 mt-2">
                  <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-wider">No nodes allocated</p>
                </div>
              ) : (
                <>
                  {(() => {
                    const validParentObj = folderStructureList.find(f => f.parentId);
                    const trueHubId = validParentObj ? validParentObj.parentId : null;
                    const rootFolders = folderStructureList.filter(f => f.parentId === trueHubId);

                    return rootFolders.map(rootFolder => {
                      const isRootActive = currentFolderId === rootFolder.id;
                      const childFolders = folderStructureList.filter(f => f.parentId === rootFolder.id);
                      const isBranchActive = currentFolderId === rootFolder.id || folderStructureList.find(f => f.id === currentFolderId)?.parentId === rootFolder.id;

                      return (
                        <div key={rootFolder.id} className="space-y-1 bg-zinc-950/20 border border-zinc-900/30 p-1 rounded-xl">
                          <div className="w-full flex items-center justify-between pr-2 rounded-lg transition-all duration-200 group border border-transparent">
                            <button
                              onClick={() => { setCurrentFolderId(rootFolder.id); recordTelemetry(`NAV_ROOT: Scope shifted to subspace tree branch -> "${rootFolder.name}"`, "info"); }}
                              className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg text-left cursor-pointer transition-colors ${isRootActive ? "text-teal-400 font-semibold" : "text-zinc-400 hover:text-zinc-200"}`}
                            >
                              <LayoutGrid className={`w-3.5 h-3.5 shrink-0 ${isRootActive ? "text-teal-400" : "text-zinc-600 group-hover:text-teal-400"}`} />
                              <span className="truncate font-mono tracking-wide text-[10px] uppercase">{rootFolder.name}</span>
                            </button>

                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                              <button onClick={(e) => handleOpenMetadataDrawer(rootFolder, e)} className="p-1 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded cursor-pointer" title="Modify Space Identity"><Edit3 className="w-2.5 h-2.5" /></button>
                              <button onClick={(e) => handleTrashAssetNode(rootFolder, e)} className="p-1 hover:bg-zinc-800 text-zinc-600 hover:text-rose-400 rounded cursor-pointer" title="Purge Space Node"><Trash2 className="w-2.5 h-2.5" /></button>
                            </div>
                          </div>

                          {isBranchActive && childFolders.map(subFolder => {
                            const isSubActive = currentFolderId === subFolder.id;
                            return (
                              <div key={subFolder.id} className="w-full flex items-center justify-between pr-2 pl-4 rounded-md transition-all duration-200 group border border-transparent">
                                <button
                                  onClick={() => { setCurrentFolderId(subFolder.id); recordTelemetry(`NAV_CHILD: Scope focused deep index node -> "${subFolder.name}"`, "info"); }}
                                  className={`flex-1 flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs text-left cursor-pointer rounded-md ${isSubActive ? "text-amber-400 font-medium" : "text-zinc-500 hover:text-zinc-300"}`}
                                >
                                  <Folder className={`w-3 h-3 shrink-0 ${isSubActive ? "text-amber-400" : "text-zinc-600 group-hover:text-zinc-400"}`} />
                                  <span className="truncate tracking-wide text-[11px]">{subFolder.name}</span>
                                </button>
                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                                  <button onClick={(e) => handleOpenMetadataDrawer(subFolder, e)} className="p-0.5 hover:bg-zinc-800 text-zinc-600 hover:text-zinc-300 rounded cursor-pointer"><Edit3 className="w-2.5 h-2.5" /></button>
                                  <button onClick={(e) => handleTrashAssetNode(subFolder, e)} className="p-0.5 hover:bg-zinc-800 text-zinc-700 hover:text-rose-400 rounded cursor-pointer"><Trash2 className="w-2.5 h-2.5" /></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    });
                  })()}

                  {isCreatingRoot && (
                    <div className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-teal-500/20 bg-teal-500/5 text-teal-400 animate-pulse select-none font-mono text-[10px]">
                      <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      <span className="tracking-wider uppercase">Allocating space...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </aside>

        {/* --- Main Viewing Viewport Pane --- */}
        <main className="flex-1 h-full flex min-w-0 bg-[#09090b] overflow-hidden relative">
          <div className="flex-1 h-full flex flex-col overflow-hidden">

            {/* Navigation Control Bar */}
            <header className="h-14 border-b border-zinc-900 px-6 flex items-center justify-between gap-4 shrink-0 bg-[#09090b]/80 backdrop-blur-md z-40">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="p-2 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors duration-200 shrink-0 flex items-center justify-center shadow-md cursor-pointer"
                >
                  {isSidebarOpen ? <PanelLeftClose className="w-4 h-4 text-zinc-500 hover:text-rose-400" /> : <PanelLeft className="w-4 h-4 text-teal-400" />}
                </button>

                <div
                  onClick={() => setIsSearchOpen(true)}
                  className="w-full max-w-sm flex items-center justify-between px-3 py-1.5 bg-zinc-950 border border-zinc-900 hover:border-zinc-800 rounded-xl cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-400">
                    <Search className="w-3.5 h-3.5" />
                    <span className="text-xs font-sans tracking-wide">Search indexing nodes...</span>
                  </div>
                  <kbd className="hidden sm:inline-flex items-center h-5 px-2 font-meta text-[9px] bg-zinc-900 text-zinc-500 border border-zinc-800 rounded-md shadow-inner">⌘K</kbd>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {session ? (
                  <>
                    {/* Toggle HUD Button Trigger Accent */}
                    <button
                      onClick={() => setIsHudOpen(p => !p)}
                      className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono font-bold rounded-xl h-8 border transition-all ${isHudOpen ? "bg-teal-950/30 text-teal-400 border-teal-800/60 shadow-[0_0_10px_rgba(20,184,166,0.15)]" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                        }`}
                    >
                      <Columns className="w-3.5 h-3.5" /> HUD: {isHudOpen ? "ON" : "OFF"}
                    </button>

                    <div className="flex items-center gap-2 border border-zinc-900 bg-zinc-950/40 px-3 py-1 rounded-xl h-8 shadow-inner select-none">
                      {session.user?.image && <img src={session.user.image} alt="Profile" className="w-4 h-4 rounded-full border border-zinc-700" />}
                      <span className="text-[11px] text-zinc-400 font-mono tracking-tight max-w-[110px] truncate">{session.user?.name}</span>
                    </div>

                    <button
                      onClick={handleCreateNewFolder}
                      disabled={!currentFolderId}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl h-8 border transition-all duration-200 ${currentFolderId
                        ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-zinc-100 cursor-pointer shadow-md shadow-black/20"
                        : "bg-zinc-950 border-zinc-900/60 text-zinc-600 cursor-not-allowed opacity-40 shadow-none"
                        }`}
                      title={!currentFolderId ? "Select a workspace subspace tree node first" : "Create dynamic subfolder configuration"}
                    >
                      <FolderPlus className={`w-3.5 h-3.5 ${currentFolderId ? "text-teal-400" : "text-zinc-600"}`} /> Folder
                    </button>

                    <button
                      onClick={() => setIsLinkModalOpen(true)}
                      disabled={!currentFolderId}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl h-8 border transition-all duration-200 ${currentFolderId
                        ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-zinc-100 cursor-pointer shadow-md shadow-black/20"
                        : "bg-zinc-950 border-zinc-900/60 text-zinc-600 cursor-not-allowed opacity-40 shadow-none"
                        }`}
                      title={!currentFolderId ? "Select a workspace subspace tree node first" : "Embed external live asset node"}
                    >
                      <Plus className="w-3.5 h-3.5 text-zinc-400" /> Link
                    </button>

                    <button
                      onClick={handleCreateDocument}
                      disabled={!currentFolderId}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl h-8 shadow-lg shadow-teal-950/40 transition-all duration-200 ${currentFolderId
                        ? "bg-teal-600 hover:bg-teal-500 text-white cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        : "bg-zinc-900 text-zinc-600 border border-zinc-800/80 cursor-not-allowed opacity-40 shadow-none"
                        }`}
                      title={!currentFolderId ? "Select a workspace subspace tree node first" : "Provision beautiful google document"}
                    >
                      <Plus className="w-3.5 h-3.5" /> Document
                    </button>

                    <button onClick={handleLogoutClick} className="px-3 py-1.5 border border-zinc-900 text-[10px] font-extrabold uppercase tracking-wider text-rose-400/80 hover:text-rose-400 bg-rose-950/10 hover:bg-rose-950/20 rounded-xl transition-colors duration-200 h-8 cursor-pointer shadow-sm">
                      Logout
                    </button>
                  </>
                ) : (
                  <button onClick={() => signIn("google")} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-black/40 h-8 cursor-pointer hover:scale-[1.02] active:scale-[0.98]">
                    Connect Google Workspace
                  </button>
                )}
              </div>
            </header>

            {/* --- NEW TAB VIEWPORT ROW BAR SYSTEM --- */}
            {status === "authenticated" && !hubMissingAlert && (
              <div className="h-9 border-b border-zinc-900/80 bg-[#09090b] flex items-center px-6 space-x-1.5 select-none shrink-0 z-30">
                {tabs.map((tab) => {
                  const isTabFocused = tab.id === activeTabId;
                  return (
                    <div
                      key={tab.id}
                      onClick={() => handleSelectTab(tab.id, tab.activeFolderId)}
                      className={`group flex items-center space-x-2 px-3 py-1 border border-b-0 rounded-t-lg font-mono text-[10px] tracking-wide cursor-pointer transition-all duration-150 ${isTabFocused
                        ? "bg-zinc-900 border-zinc-800 text-teal-400 font-bold"
                        : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
                        }`}
                    >
                      <span>{tab.label}</span>
                      {tabs.length > 1 && (
                        <button
                          onClick={(e) => handleCloseTab(tab.id, e)}
                          className="text-zinc-700 hover:text-rose-400 opacity-40 group-hover:opacity-100 transition-opacity font-sans pl-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={handleCreateNewTab}
                  className="px-2 py-1 text-[10px] font-mono font-bold text-zinc-600 hover:text-teal-500 transition-colors cursor-pointer"
                >
                  + FORK WINDOW
                </button>
              </div>
            )}

            {/* Dynamic Display Rendering Matrix */}
            <section className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-none relative z-30 pb-28">
              {status !== "authenticated" ? (
                <div className="h-[60vh] flex flex-col items-center justify-center text-center p-8 border border-dashed border-zinc-800 rounded-2xl bg-[#0c0c0e]/30 mt-10 shadow-2xl relative overflow-hidden max-w-lg mx-auto">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f12_1px,transparent_1px),linear-gradient(to_bottom,#0f0f12_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"></div>
                  <Terminal className="w-10 h-10 text-zinc-600 mb-4 animate-pulse" />
                  <h2 className="text-sm font-bold text-zinc-300 font-mono uppercase tracking-wider">Access Lock Protocols Engaged</h2>
                  <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed font-sans">Secure terminal synchronization requires active authentication. Tunnel your workspace safely using standard Google OAuth pipelines.</p>
                  <button onClick={() => signIn("google")} className="mt-5 flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold rounded-xl transition-all shadow-md shadow-black/40 cursor-pointer">
                    Authorize Session
                  </button>
                </div>
              ) : !currentFolderId ? (
                /* Immersive Grid Standby Landing Mask Layer */
                <div className="h-[78vh] flex flex-col items-center justify-center text-center p-8 border border-zinc-900 bg-[#0c0c0e]/30 rounded-2xl relative overflow-hidden group shadow-2xl">
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#0e0e11_1px,transparent_1px),linear-gradient(to_bottom,#0e0e11_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_60%,transparent_100%)] opacity-80"></div>
                  <div className="relative z-10 flex flex-col items-center max-w-sm">
                    <div className="p-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl mb-4 shadow-2xl shadow-black/40 group-hover:border-teal-500/20 transition-colors duration-500 group-hover:scale-105 transform">
                      <Terminal className="w-5 h-5 text-zinc-500 group-hover:text-teal-400 transition-colors duration-300" />
                    </div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-[0.25em] bg-gradient-to-r from-zinc-300 to-zinc-500 bg-clip-text text-transparent group-hover:from-zinc-200 group-hover:to-teal-400 transition-all duration-500">Mainframe Initialized</h3>
                    <p className="text-[11px] text-zinc-500 mt-2.5 leading-relaxed font-sans font-medium">
                      Cloud mapping nodes parsed successfully. Select an active subspace terminal from the <span className="text-zinc-400 font-semibold font-mono">Hub Tree</span> matrix to load your deep asset framework pipeline.
                    </p>
                  </div>
                </div>
              ) : (
                /* Folder Content Render Pipeline */
                <>
                  {/* Breadcrumb Context Ribbon */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0c0c0e]/60 border border-zinc-900 rounded-xl overflow-x-auto whitespace-nowrap scrollbar-none shadow-sm shadow-black/20 backdrop-blur-sm max-w-max select-none">
                    <button
                      className="flex items-center gap-1.5 text-zinc-400 hover:text-teal-400 transition-colors duration-200 cursor-pointer"
                      onClick={() => { setCurrentFolderId(null); recordTelemetry("NAV_RESET: Returned focus context back to top-level tracking root.", "info"); }}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider">myhub</span>
                    </button>

                    {breadcrumbs.map((crumb, idx) => (
                      <div key={crumb.id} className="flex items-center gap-1.5 text-zinc-700">
                        <ChevronRight className="w-3 h-3 shrink-0" />
                        <button
                          onClick={() => setCurrentFolderId(crumb.id)}
                          disabled={idx === breadcrumbs.length - 1}
                          className={`text-[11px] font-mono tracking-wide px-2 py-0.5 rounded-md transition-all duration-200 ${idx === breadcrumbs.length - 1 ? "text-teal-400 bg-teal-500/10 border border-teal-500/20 font-bold" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 cursor-pointer"}`}
                        >
                          {crumb.name}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Subfolders Matrix Section Grid */}
                  {(subFolders.length > 0 || isCreatingFolder) && (
                    <div className="space-y-3 animate-[fadeIn_0.3s_ease-out]">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-zinc-500 font-mono px-1">Nested Subfolders</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {subFolders.map(folder => (
                          <div
                            key={folder.id}
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="p-3.5 bg-zinc-900/20 hover:bg-zinc-900/50 border border-zinc-900 hover:border-zinc-800/80 rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between gap-3 group shadow-sm hover:shadow-md hover:-translate-y-0.5 transform select-none"
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className="p-1.5 bg-zinc-950/40 border border-zinc-800/40 rounded-lg group-hover:border-teal-500/20 transition-colors duration-200">
                                <Folder className="w-3.5 h-3.5 text-teal-500/80 group-hover:text-teal-400 transition-colors duration-200" />
                              </div>
                              <span className="text-xs font-semibold text-zinc-400 group-hover:text-zinc-200 truncate font-sans tracking-wide">{folder.name}</span>
                            </div>

                            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                              <button onClick={(e) => handleOpenMetadataDrawer(folder, e)} className="p-1 hover:bg-zinc-950 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-lg cursor-pointer"><Edit3 className="w-3 h-3" /></button>
                              <button onClick={(e) => handleTrashAssetNode(folder, e)} className="p-1 hover:bg-zinc-950 border border-transparent hover:border-zinc-800 text-zinc-600 hover:text-rose-400 rounded-lg cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                        ))}

                        {isCreatingFolder && (
                          <div className="p-3.5 bg-teal-500/5 border border-teal-500/20 rounded-xl text-teal-400/80 flex items-center gap-3 animate-pulse select-none shadow-sm">
                            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-teal-400" />
                            <span className="text-xs font-mono tracking-wide font-medium uppercase text-[10px]">Syncing node...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Documents & Active Assets Node Section */}
                  <div className="space-y-3 animate-[fadeIn_0.4s_ease-out]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-900 pb-2 px-1 gap-3">
                      <h4 className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-zinc-500 font-mono">Active Index Assets</h4>

                      <div className="flex items-center gap-4">
                        {/* Feature 4 Actions Content Toolbar Trigger */}
                        {selectedFileIds.length > 0 && (
                          <div className="flex items-center gap-2 bg-zinc-900 px-3 py-1 rounded-xl border border-zinc-800 animate-fade-in font-mono text-[10px]">
                            <span className="text-teal-400 font-bold">{selectedFileIds.length} flagged</span>
                            <button onClick={handleBulkOpenTabs} className="text-zinc-300 hover:text-white px-2 py-0.5 bg-zinc-950 rounded border border-zinc-800 hover:border-zinc-700 cursor-pointer flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" /> Execute Open
                            </button>
                            <button onClick={() => setSelectedFileIds([])} className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"><X className="w-3 h-3" /></button>
                          </div>
                        )}

                        <div className="flex items-center bg-zinc-950 border border-zinc-900 p-0.5 rounded-lg text-[9px] font-mono tracking-wider select-none">
                          {["ALL", "DOCS", "SHEETS", "LINKS"].map(mask => (
                            <button
                              key={mask}
                              onClick={() => { setActiveFilterMask(mask); recordTelemetry(`FILTER: Applied viewport matrix mask filter -> "${mask}"`, "info"); }}
                              className={`px-2 py-0.5 rounded-md font-bold transition-all cursor-pointer ${activeFilterMask === mask ? "bg-zinc-900 text-teal-400 border border-zinc-800" : "text-zinc-600 hover:text-zinc-400"}`}
                            >
                              {mask}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {displayFiles.length === 0 && !isCreatingDoc ? (
                      <div className="h-36 border border-dashed border-zinc-900 rounded-2xl flex flex-col items-center justify-center text-zinc-600 text-xs bg-zinc-950/10 p-6 shadow-inner select-none">
                        <Terminal className="w-5 h-5 text-zinc-800 mb-2" />
                        <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-700">Empty directory matrix</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        {isCreatingDoc && (
                          <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-2xl flex items-start gap-3.5 animate-pulse select-none shadow-sm">
                            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded-xl shrink-0">
                              <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs font-mono text-teal-400 font-bold tracking-wider uppercase text-[10px]">Allocating Asset...</h3>
                              <p className="text-[10px] font-sans text-zinc-600 mt-1 truncate">Piping workspace payload architecture</p>
                            </div>
                          </div>
                        )}

                        {displayFiles.map(file => {
                          const isFileChecked = selectedFileIds.includes(file.id);
                          return (
                            <div
                              key={file.id}
                              onClick={() => { recordTelemetry(`EXEC: Requesting remote browser initialization for -> "${file.name}"`, "success"); window.open(file.url, "_blank", "noopener,noreferrer"); }}
                              className={`p-4 bg-[#0d0d11]/40 border rounded-2xl cursor-pointer transition-all duration-200 flex flex-col gap-3 group shadow-sm hover:shadow-xl hover:shadow-black/20 hover:bg-[#121217]/60 hover:-translate-y-0.5 transform relative ${isFileChecked ? "border-teal-500/30 bg-teal-950/5" : "border-zinc-900/80 hover:border-zinc-800"}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3.5 min-w-0">
                                  <button
                                    onClick={(e) => toggleSelectFile(file.id, e)}
                                    className="mt-1 text-zinc-700 hover:text-teal-400 transition-colors shrink-0 cursor-pointer"
                                  >
                                    {isFileChecked ? <CheckSquare className="w-4 h-4 text-teal-400" /> : <Square className="w-4 h-4 text-zinc-800 group-hover:text-zinc-600" />}
                                  </button>

                                  <div className="p-2.5 bg-zinc-950 border border-zinc-900 group-hover:border-zinc-800 rounded-xl shrink-0 transition-colors duration-200 shadow-inner">
                                    {file.type === "google_doc" && <FileText className="w-4 h-4 text-sky-400" />}
                                    {file.type === "google_sheet" && <Table className="w-4 h-4 text-emerald-400" />}
                                    {file.type === "external_link" && <Link2 className="w-4 h-4 text-amber-400" />}
                                  </div>
                                  <div className="min-w-0 pt-0.5">
                                    <h3 className="text-xs font-bold text-zinc-300 group-hover:text-white truncate transition-colors duration-200 tracking-wide font-sans">{file.name}</h3>
                                    <p className="text-[10px] font-mono text-zinc-500 mt-1 truncate tracking-tight uppercase group-hover:text-zinc-400 transition-colors duration-200">Open Node Link</p>
                                  </div>
                                </div>

                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 z-40">
                                  <button onClick={(e) => handleDirectDownloadPipe(file, e)} className="p-1 hover:bg-zinc-950 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-teal-400 rounded-lg cursor-pointer" title="Download Local Binary Copy"><Download className="w-3 h-3" /></button>
                                  <button onClick={(e) => handleOpenMetadataDrawer(file, e)} className="p-1 hover:bg-zinc-950 border border-transparent hover:border-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-lg cursor-pointer" title="Edit Metadata Profile"><Edit3 className="w-3 h-3" /></button>
                                  <button onClick={(e) => handleTrashAssetNode(file, e)} className="p-1 hover:bg-zinc-950 border border-transparent hover:border-zinc-800 text-zinc-600 hover:text-rose-400 rounded-lg cursor-pointer" title="Purge Node Link"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              </div>

                              <div className="h-0 opacity-0 overflow-hidden group-hover:h-4 group-hover:opacity-100 transition-all duration-200 border-t border-zinc-900/80 pt-1.5 flex items-center justify-between font-mono text-[8px] text-zinc-600">
                                <span>MIME: {file.type.toUpperCase()}</span>
                                <span>INDEX_HEX_ID: 0x{file.id.substring(0, 6).toUpperCase()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>

            {/* Practical Feature 1: Monospaced Telemetry Monitor Side-Drawer Log Terminal */}

          </div>

          {/* --- NEW ADDITION: Iron Man Helmet Holographic HUD Overlay Panel (Low Opacity, Blurred Backing, Initially Open) --- */}
          {/* --- Consolidated High-Fidelity Holographic HUD Panel --- */}
          {isHudOpen && status === "authenticated" && !hubMissingAlert && (
            <div className="fixed bottom-10 right-6 w-80 z-50 pointer-events-auto flex flex-col bg-[#0a192f]/05 backdrop-blur-lg border border-teal-500/10 rounded-xl shadow-[0_0_60px_rgba(20,184,166,0.03)] overflow-hidden animate-fade-in select-none">
              {/* Geometric Edge Trailing Corner Accents */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-teal-500/30" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-teal-500/30" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-teal-500/30" />
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-teal-500/30" />

              {/* Header */}
              <div className="p-2.5 bg-teal-950/10 border-b border-teal-500/05 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-1 h-1 bg-teal-400 rounded-full animate-ping" />
                  <span className="text-[9px] font-mono tracking-[0.2em] text-teal-400/80 font-bold uppercase">Diagnostics_HUD</span>
                </div>
                <button onClick={() => setIsHudOpen(false)} className="text-zinc-600 hover:text-teal-400 transition-colors p-0.5 text-[9px] font-mono cursor-pointer">✕</button>
              </div>

              {/* Operational Data Display Field */}
              <div className="p-3 space-y-3 font-mono text-[9px] text-zinc-500 selection:bg-teal-950/30">

                {/* Structural Allocation Allocation Telemetry Matrix */}
                <div className="grid grid-cols-2 gap-2 bg-zinc-950/20 p-2 rounded-lg border border-zinc-900/40">
                  <div className="space-y-0.5">
                    <span className="text-[8px] text-zinc-600 block uppercase">Indexed Nodes</span>
                    <span className="text-teal-400 font-bold text-xs">{filesList.length + folderStructureList.length}</span>
                  </div>
                  <div className="space-y-0.5 border-l border-zinc-900/60 pl-2">
                    <span className="text-[8px] text-zinc-600 block uppercase">Creator</span>
                    <span className={`font-bold text-xs ${selectedFileIds.length > 0 ? "text-amber-400" : "text-zinc-600"}`}>
                      Kurmananda
                    </span>
                  </div>
                </div>

                {/* Dynamic Telemetry Target Status Array mapping cache values */}
                

                {/* Live System Broadcast History Event Feed */}
                <div className="space-y-1">
                  <span className="text-zinc-600 uppercase text-[8px] tracking-wider">Live Telemetry Trace Stream:</span>
                  <div className="space-y-1 text-[9px] leading-relaxed max-h-[80px] overflow-hidden flex flex-col-reverse opacity-70">
                    {terminalLogs.slice(-3).reverse().map((log) => (
                      <p key={log.id} className={`truncate ${log.type === "success" ? "text-emerald-400/80" : log.type === "error" ? "text-rose-400/80" : "text-teal-300/60"}`}>
                        &gt; {log.text.substring(log.text.indexOf("] ") + 2 || 0)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* HUD Footbar Indicator metrics */}
              <div className="p-1.5 bg-teal-950/10 border-t border-teal-500/05 flex justify-between items-center px-3 text-[8px] font-mono text-teal-600/50">
                <span>REF_BUS_HZ: 60.00</span>
                <span>MATRIX_TUNNEL_STATE: OK</span>
              </div>
            </div>
          )}

          {/* --- Feature 2 Component Block: Clean Right Slide-out Metadata Modification Panel Drawer --- */}
          {editingAsset && (
            <div className="w-72 h-full bg-[#0c0c0e] border-l border-zinc-900 flex flex-col shrink-0 animate-fade-in z-50 shadow-2xl">
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between bg-zinc-950/20 select-none">
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  <Edit3 className="w-3.5 h-3.5 text-teal-400" /> Node Telemetry Modification
                </div>
                <button onClick={() => setEditingAsset(null)} className="text-zinc-600 hover:text-zinc-400 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleUpdateAssetMetadata} className="p-4 flex-1 flex flex-col gap-4 font-sans justify-between">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="block text-[8px] font-mono uppercase font-bold text-zinc-600 tracking-wider">Node Registry Identity</span>
                    <span className="block text-[10px] font-mono text-zinc-500 truncate bg-zinc-950 p-2 rounded-lg border border-zinc-900 select-all">{editingAsset.id}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-bold font-mono uppercase text-zinc-500 tracking-wider">Modify Record Descriptor</label>
                    <input
                      type="text"
                      required
                      value={newMetadataName}
                      onChange={(e) => setNewMetadataName(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-900 rounded-xl text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-zinc-800 focus:ring-0 font-medium cursor-text"
                    />
                  </div>

                  <div className="space-y-1 border-t border-zinc-900/60 pt-3">
                    <span className="block text-[8px] font-mono uppercase font-bold text-zinc-600 tracking-wider">System Mapping Class</span>
                    <span className="block text-[10px] font-mono uppercase text-zinc-500">{editingAsset.type ? editingAsset.type.replace('_', ' ') : "DIRECTORY STRUCTURE"}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingMetadata || !newMetadataName.trim()}
                  className="w-full py-2 bg-zinc-100 hover:bg-white text-zinc-950 disabled:bg-zinc-900 disabled:text-zinc-600 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isUpdatingMetadata ? <Loader2 className="w-3 h-3 animate-spin" /> : "Commit Modification"}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* --- NEW ADDITION: Drag & Drop Dropzone Overlay Interceptor Display Panel --- */}
      {isDraggingOver && (
        <div
          onDragLeave={handleDragLeaveZone}
          onDrop={handleDropPayload}
          className="absolute inset-0 z-50 bg-teal-950/5 backdrop-blur-sm border-2 border-dashed border-teal-500/30 m-4 rounded-2xl flex flex-col justify-center items-center select-none"
        >
          <div className="bg-[#0c0c0e]/95 border border-zinc-900 p-6 rounded-2xl text-center shadow-2xl shadow-black max-w-sm font-sans animate-fade-in">
            <span className="text-3xl block mb-2">📥</span>
            <h4 className="font-mono text-xs text-teal-400 font-bold uppercase tracking-widest">Transmit Local Assets</h4>
            <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">
              Release data payloads anywhere inside this box to stream files directly into the active directory node.
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Network Upload Stream Banner */}
      {uploadProgress && (
        <div className="fixed bottom-12 left-6 z-50 bg-[#0c0c0e] border border-zinc-900 px-4 py-2.5 rounded-xl shadow-2xl shadow-black flex items-center space-x-3 font-mono text-[10px]">
          <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
          <span className="text-zinc-400">{uploadProgress}</span>
        </div>
      )}

      {/* --- Handy Feature 2: Micro-Calibration System Status Ticker Footer Panel --- */}
      <footer className="h-6 border-t border-zinc-900 bg-zinc-950/90 px-4 text-[9px] font-mono text-zinc-500 flex items-center justify-between z-50 select-none shrink-0">
        <div className="flex items-center gap-4">
          <span>DIR_VECTORS: <span className="text-zinc-400 font-bold">{folderStructureList.length}</span></span>
          <span className="text-zinc-800">|</span>
          <span>ASSET_POINTERS: <span className="text-zinc-400 font-bold">{filesList.length}</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse"></span>
          <span>SYSTEM_BUS: <span className="text-teal-400 font-bold">NOMINAL</span></span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>FILTER_MASK: <span className="text-zinc-400 uppercase font-bold">{activeFilterMask}</span></span>
          <span className="text-zinc-800">|</span>
          <span>CONNECTION: <span className="text-zinc-400 font-bold">TUNNELED</span></span>
        </div>
      </footer>
    </div>
  );
}