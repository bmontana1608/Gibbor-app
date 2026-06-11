import { useState, useEffect } from 'react';
import { PlaySquare } from 'lucide-react';

interface TikTokThumbnailProps {
  url: string;
  tiktokId: string;
}

export function TikTokThumbnail({ url, tiktokId }: TikTokThumbnailProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    // First try the tikwm static url as it's fastest if it works
    const staticUrl = `https://www.tikwm.com/video/cover/${tiktokId}.webp`;
    
    const checkStaticUrl = new Image();
    checkStaticUrl.src = staticUrl;
    checkStaticUrl.onload = () => {
      if (isMounted) setCoverUrl(staticUrl);
    };
    checkStaticUrl.onerror = async () => {
      // Fallback to our oEmbed proxy
      try {
        const res = await fetch(`/api/tiktok-oembed?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.thumbnailUrl && isMounted) {
          setCoverUrl(data.thumbnailUrl);
        } else {
          if (isMounted) setError(true);
        }
      } catch (e) {
        if (isMounted) setError(true);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [url, tiktokId]);

  if (error || !coverUrl) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 opacity-20 bg-gradient-to-tr from-[#00f2fe] to-[#4facfe]"></div>
        <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shadow-[0_0_15px_rgba(255,0,80,0.5)] border border-[#00f2fe]/50">
           <PlaySquare className="text-white w-5 h-5 ml-0.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black flex items-center justify-center relative overflow-hidden group">
      <img 
        src={coverUrl} 
        alt="TikTok Thumbnail"
        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
        referrerPolicy="no-referrer"
      />
      <div className="w-12 h-12 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform relative z-10 shadow-[0_0_15px_rgba(255,0,80,0.5)] border border-[#00f2fe]/50">
         <PlaySquare className="text-white w-5 h-5 ml-0.5" />
      </div>
    </div>
  );
}
