// src/app/api/upload-asset/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { google } from "googleapis";
import { Readable } from "stream";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ success: false, error: "Unauthorized access path." }, { status: 401 });
    }

    const formData = await request.formData();
    const filePayload = formData.get("file");
    const parentId = formData.get("parentId") || "root";

    if (!filePayload) {
      return NextResponse.json({ success: false, error: "Missing required file payload parameters." }, { status: 400 });
    }

    // Setup Auth client instance
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    // Stream byte mapping compilation convertor
    const arrayBuffer = await filePayload.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const mediaStream = Readable.from(buffer);

    // Broadcast file data create command downstream to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: filePayload.name,
        parents: [parentId],
      },
      media: {
        mimeType: filePayload.type,
        body: mediaStream,
      },
      fields: "id",
    });

    return NextResponse.json({ success: true, fileId: driveResponse.data.id });

  } catch (error) {
    console.error("Cloud Multi-Part Upload Handling System Intercept Failure:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}