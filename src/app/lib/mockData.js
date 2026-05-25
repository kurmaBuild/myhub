// src/lib/mockData.js

export const mockFolders = [
  { id: "root-1", name: "Autonomous Drone Project", parentId: null },
  { id: "root-2", name: "Web App Startups", parentId: null },
  { id: "sub-1", name: "Hardware Schematics", parentId: "root-1" },
  { id: "sub-2", name: "Flight Control Logs", parentId: "root-1" },
  { id: "sub-3", name: "Flyleaf Bookstore App", parentId: "root-2" },
  { id: "sub-deep-1", name: "LiDAR Calibration Tests", parentId: "sub-1" },
];

export const mockFiles = [
  { id: "file-1", name: "MAVLink Connection String Guide", type: "google_doc", folderId: "sub-2", url: "https://docs.google.com" },
  { id: "file-2", name: "Optical Flow Sensor Matrix", type: "google_sheet", folderId: "sub-1", url: "https://docs.google.com" },
  { id: "file-3", name: "Figma UI Workspace Canvas", type: "external_link", folderId: "sub-3", url: "https://figma.com" },
];