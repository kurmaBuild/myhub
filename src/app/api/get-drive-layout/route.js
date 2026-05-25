// src/app/api/get-drive-layout/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import axios from "axios";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const headers = { Authorization: `Bearer ${session.accessToken}` };

    // 1. Locate the live single-source-of-truth 'myhub' folder root key
    const findHubFolder = await axios.get("https://www.googleapis.com/drive/v3/files", {
      headers,
      params: {
        q: "name = 'myhub' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: "files(id, name)",
        pageSize: 1
      }
    });

    // DECLARE BOTH TRACKING POINTERS SAFELY AT THE TOP OF THE SCOPE
    let hubFolderId;
    let autoProvisionedLog = false;
    const hubFolder = findHubFolder.data.files?.[0];

    if (!hubFolder) {
      // INTERCEPT AND AUTO-PROVISION WORKSPACE SEAMLESSLY
      try {
        const createFolderResponse = await axios.post(
          "https://www.googleapis.com/drive/v3/files",
          {
            name: "myhub",
            mimeType: "application/vnd.google-apps.folder"
          },
          {
            headers,
            params: { fields: "id" }
          }
        );
        hubFolderId = createFolderResponse.data.id;
        autoProvisionedLog = true;
      } catch (creationError) {
        console.error("Auto-provision root directory failure:", creationError.response?.data || creationError.message);
        return NextResponse.json({ success: false, error: "Failed to seamlessly auto-create root folder 'myhub'." }, { status: 500 });
      }
    } else {
      hubFolderId = hubFolder.id;
    }

    // 2. FIXED QUERY: We remove the restrictive single parent filter and fetch ALL untrashed...


    // 2. FIXED QUERY: We remove the restrictive single parent filter and fetch ALL untrashed 
    // files inside the user's account, then selectively map our tree elements.
    const driveResponse = await axios.get("https://www.googleapis.com/drive/v3/files", {
      headers,
      params: {
        pageSize: 1000, // Expand ceiling block to handle multi-layered directory indices
        fields: "files(id, name, mimeType, parents)",
        q: "trashed = false"
      }
    });

    const allDriveItems = driveResponse.data.files || [];

    // Create quick lookup maps/sets to dynamically track what belongs inside 'myhub'
    const absoluteHubFolders = new Set([hubFolderId]);
    const folders = [];
    const rawFiles = [];

    // PASS 1: Isolate and structure folder nodes hierarchically
    // We run multiple passes or rely on parent chain discovery to catch deep nested workspaces
    let structureChanged = true;
    while (structureChanged) {
      structureChanged = false;
      allDriveItems.forEach((item) => {
        if (item.mimeType === "application/vnd.google-apps.folder") {
          const parentId = item.parents?.[0];
          if (parentId && absoluteHubFolders.has(parentId) && !absoluteHubFolders.has(item.id)) {
            absoluteHubFolders.add(item.id);
            folders.push({
              id: item.id,
              name: item.name,
              parentId: parentId
            });
            structureChanged = true;
          }
        }
      });
    }



    // PASS 2: Route assets cleanly to their respective container parent IDs
    allDriveItems.forEach((item) => {
      if (item.mimeType !== "application/vnd.google-apps.folder") {
        const parentId = item.parents?.[0];
        // Ensure the asset is contained inside our 'myhub' folder tracking grid space
        if (parentId && absoluteHubFolders.has(parentId)) {
          let type = "external_link";
          let targetUrl = `https://docs.google.com/document/d/${item.id}/edit`;

          if (item.mimeType === "application/vnd.google-apps.document") {
            type = "google_doc";
          } else if (item.mimeType === "application/vnd.google-apps.spreadsheet") {
            type = "google_sheet";
            targetUrl = `https://docs.google.com/spreadsheets/d/${item.id}/edit`;
          }

          rawFiles.push({
            id: item.id,
            name: item.name,
            type: type,
            folderId: parentId,
            url: targetUrl
          });
        }
      }
    });
    return NextResponse.json({
      success: true,
      folders,
      files: rawFiles,
      hubFolderId,
      autoProvisioned: autoProvisionedLog
    });
  } catch (error) {
    console.error("Secure Internal Drive Interception Failure:", error.response?.data || error.message);
    return NextResponse.json({ success: false, folders: [], files: [], hubMissing: true });
  }
}