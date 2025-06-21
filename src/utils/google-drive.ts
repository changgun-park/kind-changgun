/**
 * Generate Google Drive link from file ID
 */
export function generateGoogleDriveLink(fileId: string): string {
  if (!fileId) {
    return "";
  }

  // Clean the file ID if it contains a full URL
  const cleanFileId = extractFileIdFromUrl(fileId);
  if (!cleanFileId) {
    console.warn(`Invalid Google Drive file ID: ${fileId}`);
    return "";
  }

  return `https://drive.google.com/file/d/${cleanFileId}/view`;
}

/**
 * Extract file ID from Google Drive URL
 */
function extractFileIdFromUrl(url: string): string | null {
  if (!url) return null;

  // If it's already just a file ID (no URL), return it
  if (!url.includes("drive.google.com") && !url.includes("docs.google.com")) {
    return url;
  }

  // Extract file ID from various Google Drive URL patterns
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/, // /d/FILE_ID
    /\/file\/d\/([a-zA-Z0-9_-]+)/, // /file/d/FILE_ID
    /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/, // /spreadsheets/d/FILE_ID
    /\/document\/d\/([a-zA-Z0-9_-]+)/, // /document/d/FILE_ID
    /\/presentation\/d\/([a-zA-Z0-9_-]+)/, // /presentation/d/FILE_ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Generate Google Drive link for different file types
 */
export function generateGoogleDriveLinkByType(
  fileId: string,
  mimeType?: string
): string {
  if (!fileId) {
    return "";
  }

  const cleanFileId = extractFileIdFromUrl(fileId);
  if (!cleanFileId) {
    console.warn(`Invalid Google Drive file ID: ${fileId}`);
    return "";
  }

  // Different Google Drive link formats based on file type
  if (mimeType?.includes("spreadsheet")) {
    return `https://docs.google.com/spreadsheets/d/${cleanFileId}/view`;
  } else if (mimeType?.includes("document")) {
    return `https://docs.google.com/document/d/${cleanFileId}/view`;
  } else if (mimeType?.includes("presentation")) {
    return `https://docs.google.com/presentation/d/${cleanFileId}/view`;
  } else {
    // Default to file view for PDFs and other files
    return `https://drive.google.com/file/d/${cleanFileId}/view`;
  }
}
