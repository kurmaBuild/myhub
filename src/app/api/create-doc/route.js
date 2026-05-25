// src/app/api/create-doc/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { google } from "googleapis";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    // DEBUG LOG: Verify creation permissions
    console.log("POST ROUTE RECOVERY TRACE - Session Token Found:", !!session?.accessToken);

    if (!session || !session.accessToken) {
      return NextResponse.json(
        { success: false, error: "Unauthorized - Token missing from session" },
        { status: 401 }
      );
    }

    // UPDATED: Capture parentId dynamically alongside your docName parameter block
    const { docName, parentId } = await request.json();
    if (!docName) {
      return NextResponse.json({ success: false, error: "Missing document title allocation parameters." }, { status: 400 });
    }

    // Initialize the official SDK Auth wrapper using your session bearer key
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: "v3", auth: oAuth2Client });
    const docs = google.docs({ version: "v1", auth: oAuth2Client });

    let executionParents = [];

    // If the frontend explicitly forwards the target subspace folder ID, lock it directly
    if (parentId) {
      executionParents = [parentId];
    } else {
      // Fallback safeguard loop: Locate myhub folder target node location context
      const findHubFolder = await drive.files.list({
        q: "name = 'myhub' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: "files(id)",
        pageSize: 1
      });

      const hubFolderId = findHubFolder.data.files?.[0]?.id;
      executionParents = hubFolderId ? [hubFolderId] : [];
    }

    // Create the isolated document item asset node wrapper inside your workspace folder location
    const createdFileMetadata = await drive.files.create({
      requestBody: {
        name: docName,
        mimeType: "application/vnd.google-apps.document",
        parents: executionParents
      },
      fields: "id, name, webViewLink"
    });

    const newDocId = createdFileMetadata.data.id;
    const newDocUrl = createdFileMetadata.data.webViewLink;

    // Optional Master Manifest logging pipeline loop trigger configuration sequence
    const masterManifestId = process.env.MASTER_MANIFEST_DOCUMENT_ID;
    if (masterManifestId) {
      try {
        const timestampString = new Date().toISOString().replace('T', ' ').substring(0, 19);
        const auditLogLineString = `\n[${timestampString}] CREATED: "${docName}" | ID: ${newDocId} | PATH: ${newDocUrl}\n`;

        await docs.documents.batchUpdate({
          documentId: masterManifestId,
          requestBody: {
            requests: [
              {
                insertText: {
                  endOfSectionLocation: {},
                  text: auditLogLineString
                }
              }
            ]
          }
        });
      } catch (pipelineErr) {
        console.error("Warning: Master Manifest append pipeline skipped ->", pipelineErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      id: newDocId,
      name: createdFileMetadata.data.name,
      url: newDocUrl
    });

  } catch (error) {
    console.error("Master Tracking Indexing Pipeline Failure:", error.response?.data || error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Pipeline processing configuration error" },
      { status: 500 }
    );
  }
}