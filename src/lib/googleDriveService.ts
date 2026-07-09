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
 * Extract folder ID from Google Drive URL
 * Examples:
 * - https://drive.google.com/drive/folders/FOLDER_ID
 * - https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 */
export function extractFolderId(url: string): string | null {
  // Match folder ID from URL
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // If the URL itself looks like an ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url.trim())) {
    return url.trim();
  }

  return null;
}

/**
 * List files in a public Google Drive folder
 * Uses Google Drive API v3 with the folder's sharing key
 */
export async function listFolderFiles(folderUrl: string): Promise<DriveFile[]> {
  const folderId = extractFolderId(folderUrl);
  if (!folderId) {
    throw new Error('Could not extract folder ID from URL. Make sure it looks like: https://drive.google.com/drive/folders/XXXXX');
  }

  console.log(`[GoogleDrive] Listing files in folder: ${folderId}`);

  // Try Google Drive API to list files in the folder
  // This works for public/shared folders
  const apiUrl = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=AIzaSyC1qbk75NzWBvSaDh6KnUvjbjV0MZ1A8&fields=files(id,name,mimeType,size)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  try {
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      // If API fails, try alternative method - parse the folder HTML page
      console.log('[GoogleDrive] API failed, trying HTML parsing...');
      return await listFilesFromHtml(folderId);
    }

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

    console.log(`[GoogleDrive] Found ${files.length} video files`);
    return files;
  } catch (err: any) {
    console.error('[GoogleDrive] API error:', err.message);
    // Fallback to HTML parsing
    return await listFilesFromHtml(folderId);
  }
}

/**
 * Alternative: Parse Google Drive folder HTML page to extract file IDs
 */
async function listFilesFromHtml(folderId: string): Promise<DriveFile[]> {
  try {
    const url = `https://drive.google.com/drive/folders/${folderId}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to access folder (HTTP ${response.status}). Make sure the folder is shared publicly.`);
    }

    const html = await response.text();
    const files: DriveFile[] = [];

    // Extract file IDs and names from the HTML
    // Google Drive embeds file data in JSON within the HTML
    const filePatterns = [
      /\["([a-zA-Z0-9_-]{25,})",\s*"([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"[^"]*",\s*"([^"]*)"/g,
      /window\['\w+'\]\s*=\s*(\[.*?\]);/g,
    ];

    // Try to find file entries
    const fileIdRegex = /\/file\/d\/([a-zA-Z0-9_-]{25,})/g;
    const fileNameRegex = /data-tooltip="([^"]+)"/g;

    let match;
    const fileIds: string[] = [];
    while ((match = fileIdRegex.exec(html)) !== null) {
      if (!fileIds.includes(match[1])) {
        fileIds.push(match[1]);
      }
    }

    // If we found file IDs, create DriveFile objects
    for (const id of fileIds) {
      files.push({
        id,
        name: `Video_${id.substring(0, 8)}`,
        mimeType: 'video/mp4',
        downloadUrl: `https://drive.google.com/uc?export=download&id=${id}`,
      });
    }

    // Also try to extract from embedded JSON
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

    console.log(`[GoogleDrive] HTML parsing found ${files.length} files`);
    return files;
  } catch (err: any) {
    console.error('[GoogleDrive] HTML parsing failed:', err.message);
    throw new Error('Could not access the Google Drive folder. Make sure it is shared as "Anyone with the link can view".');
  }
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
