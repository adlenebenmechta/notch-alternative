// Google Drive Service - Import videos from Google Drive folders
// 
// Two modes:
// 1. Public folders: Direct download via Google Drive API (no auth needed)
// 2. Private folders: User provides OAuth token (future enhancement)
//
// For public folders, we extract file IDs and download via:
// https://drive.google.com/uc?export=download&id=FILE_ID

import { db } from '@/lib/db';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  downloadUrl: string;
  size?: number;
}

export interface ImportResult {
  ok: boolean;
  message: string;
  importedCount: number;
  videoIds: string[];
  files: DriveFile[];
  error?: string;
}

/**
 * Extract folder ID from Google Drive URL.
 *
 * Handles every URL format Google currently produces:
 *  - https://drive.google.com/drive/folders/XXXX
 *  - https://drive.google.com/drive/u/0/folders/XXXX
 *  - https://drive.google.com/drive/u/2/folders/XXXX?resourcekey=...
 *  - https://drive.google.com/drive/folders/XXXX?usp=sharing
 *  - https://drive.google.com/?id=XXXX
 *  - https://drive.google.com/drive/folders?id=XXXX
 *  - https://drive.google.com/file/d/XXXX/view  (single file, not folder — but we still extract)
 *  - https://docs.google.com/drive/folders/XXXX
 *  - Just the raw folder ID pasted directly
 */
export function extractFolderId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // Direct ID paste (Google Drive IDs are typically 25-33 chars, [a-zA-Z0-9_-])
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  // Common URL patterns (most-specific first)
  const patterns = [
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/drive\/folders\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/folderview\?id=([a-zA-Z0-9_-]+)/,
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/, // single file URL — fallback
    /[?&]id=([a-zA-Z0-9_-]+)/, // generic ?id= query param
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  // Last resort: try parsing as URL and look for an id query param
  try {
    const u = new URL(trimmed);
    const id = u.searchParams.get('id');
    if (id) return id;
  } catch {
    // not a URL — give up
  }

  return null;
}

/**
 * List files in a public Google Drive folder.
 *
 * Strategy order (most reliable first):
 *   1. embeddedfolderview HTML — works for any public folder, no API key needed
 *   2. regular folder page HTML — fallback if embed view fails
 *   3. Google Drive API v3 — last resort (only useful if a valid API key is set)
 *
 * Throws an Error with a helpful, action-oriented message if every strategy
 * fails. The error message will be surfaced directly to the user in the UI.
 */
export async function listFolderFiles(folderUrl: string): Promise<DriveFile[]> {
  const folderId = extractFolderId(folderUrl);
  if (!folderId) {
    throw new Error(
      'Could not extract folder ID from URL. Make sure it looks like: ' +
      'https://drive.google.com/drive/folders/XXXXXXX'
    );
  }

  console.log(`[GoogleDrive] Listing files in folder: ${folderId}`);

  // Collect per-strategy errors so we can surface them in the final message
  const attemptErrors: string[] = [];

  // ── Strategy 1 & 2: HTML parsing (embeddedfolderview → regular folder page) ──
  try {
    const htmlFiles = await listFilesFromHtml(folderId);
    if (htmlFiles.length > 0) {
      console.log(`[GoogleDrive] HTML parsing found ${htmlFiles.length} video files`);
      return htmlFiles;
    }
    attemptErrors.push('HTML parsing returned 0 files (folder is empty, has no videos, or is not shared publicly).');
  } catch (err: any) {
    attemptErrors.push(`HTML parsing failed: ${err.message}`);
    console.warn('[GoogleDrive] HTML parsing failed:', err.message);
  }

  // ── Strategy 3: Google Drive API v3 (only if a valid API key is set) ──
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (apiKey && apiKey.length > 20) {
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`;
    try {
      const response = await fetch(apiUrl, { signal: AbortSignal.timeout(15000) });
      if (response.ok) {
        const data = await response.json();
        const files: DriveFile[] = (data.files || [])
          .filter((f: any) => isVideoFile(f.name, f.mimeType))
          .map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
            size: parseInt(f.size || '0'),
          }));
        console.log(`[GoogleDrive] API found ${files.length} video files`);
        if (files.length > 0) return files;
        attemptErrors.push(`API returned 0 video files (HTTP ${response.status}).`);
      } else {
        const errBody = await response.text().catch(() => '');
        attemptErrors.push(`API HTTP ${response.status}: ${errBody.slice(0, 200)}`);
      }
    } catch (err: any) {
      attemptErrors.push(`API error: ${err.message}`);
      console.error('[GoogleDrive] API error:', err.message);
    }
  } else {
    attemptErrors.push('No GOOGLE_DRIVE_API_KEY env var set — API strategy skipped.');
  }

  // If everything failed, throw a clear, actionable error that includes the
  // per-strategy reasons so the user (and support) can see what happened.
  const hints = [
    'Make sure the folder is shared as "Anyone with the link can view".',
    'Open the folder URL in an incognito window — if it asks you to sign in, sharing is not public.',
    'Make sure the folder actually contains video files (MP4, MOV, AVI, etc.), not shortcuts or Google Docs.',
    'If files are very large, the owner may have disabled downloads — right-click each file → "Make a copy" to your own Drive.',
  ];
  throw new Error(
    `Could not access the Google Drive folder.\n\n` +
    `What we tried:\n- ${attemptErrors.join('\n- ')}\n\n` +
    `Things to check:\n- ${hints.join('\n- ')}`
  );
}

/**
 * Alternative: Parse Google Drive folder HTML page to extract file IDs
 *
 * Uses the reliable `embeddedfolderview` endpoint, which returns clean HTML
 * for ANY public folder ("Anyone with the link can view") without needing
 * an API key. Each file appears as:
 *   <div class="flip-entry-title">Filename.mp4</div>
 *   <a href="https://drive.google.com/file/d/FILE_ID/view">
 *
 * Falls back to the regular folder page if the embed view fails.
 */
async function listFilesFromHtml(folderId: string): Promise<DriveFile[]> {
  // ── Strategy 1: embeddedfolderview (most reliable for public folders) ──
  try {
    const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
    const response = await fetch(embedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(20000),
    });

    if (response.ok) {
      const html = await response.text();
      const files = parseEmbeddedFolderHtml(html);
      if (files.length > 0) {
        console.log(`[GoogleDrive] embeddedfolderview found ${files.length} files`);
        return files;
      }
      // If the response is OK but 0 files parsed, the folder is either empty,
      // has no videos, OR Google returned a "sign in" / "request access" page.
      // Detect those cases by looking for telltale phrases in the HTML.
      const lowerHtml = html.toLowerCase();
      if (lowerHtml.includes('sign in') && lowerHtml.includes('google')) {
        throw new Error('embeddedfolderview returned a "sign in" page — folder is NOT shared publicly.');
      }
      if (lowerHtml.includes('request access')) {
        throw new Error('embeddedfolderview returned a "request access" page — you need permission to view this folder.');
      }
      // Otherwise the folder is public but has no video files — fall through
      console.warn('[GoogleDrive] embeddedfolderview returned 0 video files (folder may be empty or contain non-video files only)');
    } else {
      throw new Error(`embeddedfolderview returned HTTP ${response.status}`);
    }
  } catch (err: any) {
    console.warn('[GoogleDrive] embeddedfolderview failed:', err.message);
    // Continue to strategy 2 — but propagate the error if strategy 2 also fails
    throw err;
  }

  // ── Strategy 2: regular folder page HTML ──────────────────────────────
  const url = `https://drive.google.com/drive/folders/${folderId}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Regular folder page returned HTTP ${response.status}. Make sure the folder is shared publicly.`);
  }

  const html = await response.text();
  const files = parseEmbeddedFolderHtml(html);

  // Also try the embedded JSON array pattern
  const jsonMatch = html.match(/\[\"([a-zA-Z0-9_-]{25,})\",\"([^\"]+)\"[^\]]*\"video\/[^\"]*\"[^\]]*\]/g);
  if (jsonMatch) {
    for (const entry of jsonMatch) {
      const idMatch = entry.match(/\"([a-zA-Z0-9_-]{25,})\"/);
      const nameMatch = entry.match(/,\"([^\"]+)\"/);
      if (idMatch && nameMatch && !files.find(f => f.id === idMatch[1])) {
        files.push({
          id: idMatch[1],
          name: nameMatch[1],
          mimeType: 'video/mp4',
          downloadUrl: `https://drive.google.com/uc?export=download&id=${idMatch[1]}`,
        });
      }
    }
  }

  console.log(`[GoogleDrive] Regular page parsing found ${files.length} files`);
  if (files.length > 0) return files;

  // If we got here, both strategies returned 0 files. Throw with a specific
  // explanation so the parent caller can surface it.
  const lowerHtml = html.toLowerCase();
  if (lowerHtml.includes('sign in') && lowerHtml.includes('google')) {
    throw new Error('Folder page returned a "sign in" prompt — folder is NOT shared publicly.');
  }
  if (lowerHtml.includes('request access')) {
    throw new Error('Folder page returned a "request access" prompt — you need permission to view this folder.');
  }
  throw new Error('Folder is accessible but contains no video files. Make sure it has MP4/MOV/AVI files (not shortcuts or Google Docs).');
}

/**
 * Parse HTML from embeddedfolderview or regular folder page to extract video files.
 * Looks for: <a href="https://drive.google.com/file/d/FILE_ID/view"> + sibling/child .flip-entry-title
 */
function parseEmbeddedFolderHtml(html: string): DriveFile[] {
  const files: DriveFile[] = [];
  const seenIds = new Set<string>();

  // Pattern 1: pairs of (file/d/ID, flip-entry-title)
  // The embedded view structure:
  //   <a href="https://drive.google.com/file/d/FILE_ID/view" ...>
  //   ...
  //   <div class="flip-entry-title">FILENAME</div>
  const linkRegex = /href="https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{25,})\/view"/g;
  const titleRegex = /class="flip-entry-title"[^>]*>([^<]+)</g;

  const ids: string[] = [];
  const titles: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = linkRegex.exec(html)) !== null) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  while ((m = titleRegex.exec(html)) !== null) {
    titles.push(m[1].trim());
  }

  // Pair them by index
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const name = titles[i] || `Video_${id.substring(0, 8)}`;
    if (isVideoFile(name, 'video/mp4')) {
      files.push({
        id,
        name,
        mimeType: 'video/mp4',
        downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
      });
    }
  }

  return files;
}

/**
 * Check if a file is a video based on name and MIME type
 */
function isVideoFile(name: string, mimeType: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v'];
  const videoMimeTypes = ['video/'];

  const hasVideoExt = videoExtensions.some((ext) => name.toLowerCase().endsWith(ext));
  const hasVideoMime = videoMimeTypes.some((type) => mimeType.startsWith(type));

  return hasVideoExt || hasVideoMime;
}

/**
 * Import videos from Google Drive folder into the library
 */
export async function importFromGoogleDrive(
  folderUrl: string,
  userId: string,
  options: {
    autoPublish?: boolean;
    publishMode?: 'now' | 'schedule' | 'bulk';
    accountId?: string;
  } = {}
): Promise<ImportResult> {
  try {
    // List files in the folder
    const files = await listFolderFiles(folderUrl);

    if (files.length === 0) {
      return {
        ok: false,
        message: 'No video files found in this Google Drive folder. Make sure the folder contains video files (MP4, MOV, etc.) and is shared publicly.',
        importedCount: 0,
        videoIds: [],
        files: [],
      };
    }

    // Create a GoogleDriveImport record
    const importRecord = await db.googleDriveImport.create({
      data: {
        folderUrl,
        folderId: extractFolderId(folderUrl),
        status: 'importing',
        totalFiles: files.length,
        autoPublish: options.autoPublish || false,
        publishMode: options.publishMode || 'now',
      },
    });

    const videoIds: string[] = [];

    // Add each file to the library
    for (const file of files) {
      try {
        // The download URL is what we store - PostPeer will fetch it
        const video = await db.generatedVideo.create({
          data: {
            userId,
            title: `GDrive: ${file.name}`,
            videoUrl: file.downloadUrl,
            thumbnailUrl: null,
            duration: null,
            scenesCount: 1,
            provider: 'gdrive',
            metadata: JSON.stringify({
              source: 'google_drive',
              fileId: file.id,
              originalName: file.name,
              folderUrl,
              importId: importRecord.id,
            }),
          },
        });
        videoIds.push(video.id);
      } catch (err: any) {
        console.error(`[GoogleDrive] Failed to import ${file.name}:`, err.message);
      }
    }

    // Update import record
    await db.googleDriveImport.update({
      where: { id: importRecord.id },
      data: {
        status: 'completed',
        importedFiles: videoIds.length,
        importedVideoIds: JSON.stringify(videoIds),
      },
    });

    // Auto-publish if requested
    if (options.autoPublish && videoIds.length > 0) {
      const { createPost } = await import('@/lib/autoPublish');
      
      // Get account
      let account;
      if (options.accountId) {
        account = await db.tikTokAccount.findFirst({
          where: { blotatoId: options.accountId, isActive: true },
        });
      }
      if (!account) {
        account = await db.tikTokAccount.findFirst({ where: { isActive: true } });
      }

      if (account) {
        for (let i = 0; i < videoIds.length; i++) {
          const video = await db.generatedVideo.findUnique({ where: { id: videoIds[i] } });
          if (!video) continue;

          if (options.publishMode === 'now') {
            await createPost({
              accountId: account.blotatoId,
              videoUrl: video.videoUrl,
              caption: video.title,
              hashtags: ['fyp', 'viral', 'ai'],
              externalId: `gdrive_${video.id}`,
            });
          } else if (options.publishMode === 'bulk') {
            // Schedule with 2-hour intervals
            const scheduledAt = new Date(Date.now() + i * 2 * 60 * 60 * 1000);
            await createPost({
              accountId: account.blotatoId,
              videoUrl: video.videoUrl,
              caption: video.title,
              hashtags: ['fyp', 'viral', 'ai'],
              externalId: `gdrive_${video.id}`,
              scheduledAt: scheduledAt.toISOString(),
            });
          }

          await new Promise((r) => setTimeout(r, 2000)); // 2s delay
        }

        await db.googleDriveImport.update({
          where: { id: importRecord.id },
          data: { publishedFiles: videoIds.length },
        });
      }
    }

    return {
      ok: true,
      message: `✅ Imported ${videoIds.length} video(s) from Google Drive!${options.autoPublish ? ' They are being published to TikTok.' : ' Check the Library tab to publish them.'}`,
      importedCount: videoIds.length,
      videoIds,
      files,
    };
  } catch (err: any) {
    console.error('[GoogleDrive] Import failed:', err.message);
    return {
      ok: false,
      message: err.message,
      importedCount: 0,
      videoIds: [],
      files: [],
      error: err.message,
    };
  }
}
