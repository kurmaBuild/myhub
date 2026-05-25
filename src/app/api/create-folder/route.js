// src/app/api/create-folder/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { google } from "googleapis";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "Unauthorized - Session missing" }, { status: 401 });
    }

    const { folderName, parentId } = await request.json();
    if (!folderName) {
      return NextResponse.json({ success: false, error: "Folder name parameter is required." }, { status: 400 });
    }

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    let finalParentId = parentId;

    // If no parentId is specified, look up the primary 'myhub' root folder
    if (!finalParentId || finalParentId === "root-1") {
      const findHubFolder = await drive.files.list({
        q: "name = 'myhub' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: "files(id)",
        pageSize: 1
      });
      finalParentId = findHubFolder.data.files?.[0]?.id;
    }

    const executionParents = finalParentId ? [finalParentId] : [];

    // Create the native Google Drive directory folder asset
    const createdFolderMetadata = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: executionParents
      },
      fields: "id, name"
    });

    return NextResponse.json({
      success: true,
      id: createdFolderMetadata.data.id,
      name: createdFolderMetadata.data.name,
      parentId: finalParentId
    });

  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error("Folder Creation Pipeline Failure:", errorMsg);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}