export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  const ytMatch = cleanUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
  return ytMatch ? ytMatch[1] : null;
}

export function isDriveUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('drive.google.com/file/d/');
}

export function getDriveId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function getTikTokId(url: string): string | null {
  if (!url) return null;
  // Matches tiktok.com/@username/video/1234567890 or tiktok.com/v/1234567890
  const match = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/)(\d+)/);
  return match ? match[1] : null;
}

export function getEmbedUrl(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  const ytId = getYouTubeId(cleanUrl);
  if (ytId) {
    return `https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0&iv_load_policy=3`;
  }
  
  const driveId = getDriveId(cleanUrl);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }
  
  const tiktokId = getTikTokId(cleanUrl);
  if (tiktokId) {
    return `https://www.tiktok.com/embed/v2/${tiktokId}`;
  }
  
  return cleanUrl; // fallback
}

export function extractVideosFromDescription(desc: string) {
  if (!desc) return { description: '', videoUrls: [] };
  const regex = /\[VIDEO\](.*?)\[\/VIDEO\]/g;
  const videoUrls: string[] = [];
  let match;
  while ((match = regex.exec(desc)) !== null) {
    videoUrls.push(match[1]);
  }
  return {
    description: desc.replace(regex, '').trim(),
    videoUrls
  };
}
