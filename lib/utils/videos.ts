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
    // color=white makes the progress bar neutral. modestbranding removes the YT logo. rel=0 prevents random recommendations.
    return `https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0&iv_load_policy=3&color=white&playsinline=1`;
  }
  
  const driveId = getDriveId(cleanUrl);
  if (driveId) {
    // Return direct download stream link. Adding &ext=.mp4 tricks the frontend into using the native <video> tag
    return `https://drive.google.com/uc?export=download&id=${driveId}&ext=.mp4`;
  }
  
  const tiktokId = getTikTokId(cleanUrl);
  if (tiktokId) {
    // Revert to official TikTok iframe to prevent black screens caused by hotlink protection
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

export async function resolveShortUrl(url: string): Promise<string> {
  if (!url) return url;
  const isShortTikTok = url.includes('vt.tiktok.com') || url.includes('vm.tiktok.com');
  const isShortYoutube = url.includes('youtu.be');
  
  if (isShortTikTok || isShortYoutube) {
    try {
      const res = await fetch(`/api/resolve-url?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const data = await res.json();
        return data.finalUrl || url;
      }
    } catch (e) {
      console.error('Failed to resolve URL', e);
    }
  }
  return url;
}
