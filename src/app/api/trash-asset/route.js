// src/app/api/trash-asset/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { google } from "googleapis";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { assetId } = await request.json();
    if (!assetId) {
      return NextResponse.json({ success: false, error: "Missing parameter: assetId" }, { status: 400 });
    }

    // Initialize credentials
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: session.accessToken });

    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    // Execute patch transaction to update trash state parameters directly inside Google Drive
    await drive.files.update({
      fileId: assetId,
      requestBody: {
        trashed: true
      }
    });

    return NextResponse.json({ success: true, message: "Asset flagged as trashed successfully." });

  } catch (error) {
    console.error("Google Drive Trash Interception Failure:", error.message);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mutate file state on Google Drive" },
      { status: 500 }
    );
  }
}