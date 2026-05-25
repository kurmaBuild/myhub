// src/app/api/download-asset/route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import { google } from "googleapis";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return new Response("Unauthorized workspace segment.", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");
    const mimeType = searchParams.get("mimeType");

    if (!fileId) return new Response("Missing parameters.", { status: 400 });

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oAuth2Client.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: "v3", auth: oAuth2Client });

    let responseData;
    let targetMime = mimeType;

    if (mimeType === "google_doc") {
      const exp = await drive.files.export({ fileId, mimeType: "text/plain" }, { responseType: "arraybuffer" });
      responseData = exp.data;
      targetMime = "text/plain";
    } else if (mimeType === "google_sheet") {
      const exp = await drive.files.export({ fileId, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, { responseType: "arraybuffer" });
      responseData = exp.data;
      targetMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    } else {
      const dl = await drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" });
      responseData = dl.data;
    }

    return new Response(Buffer.from(responseData), {
      headers: { "Content-Type": targetMime }
    });
  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}