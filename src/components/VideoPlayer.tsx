import { useState, useEffect, useRef } from 'react';
import { Button } from './ui/Button';
import { Play, Pause, RotateCcw, Volume2, VolumeX, RefreshCw, AlertCircle, Loader } from 'lucide-react';
import { isYoutubeUrl, isSupabaseStorageUrl, getSignedStorageUrl } from '../lib/videoUtils';

interface VideoPlayerProps {
  videoUrl: string;
  onProgress: (progress: number) => void;
  onComplete: () => void;
}

export function VideoPlayer({ videoUrl, onProgress, onComplete }: VideoPlayerProps) {
  // Player state
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const loadingTimeoutRef = useRef<number | null>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const isMounted = useRef(true);
  const urlRef = useRef(videoUrl);
  
  // YouTube handling
  const isYoutube = isYoutubeUrl(videoUrl);
  const youtubeIframeRef = useRef<HTMLIFrameElement>(null);
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null);
  
  // Process video URL
  const getVideoUrl = async () => {
    if (isYoutube) {
      return '';
    }
    
    if (isSupabaseStorageUrl(videoUrl)) {
      try {
        const signed = await getSignedStorageUrl(videoUrl);
        setSignedUrl(signed);
        return signed;
      } catch (err) {
        console.error('Error getting signed URL:', err);
        return videoUrl;
      }
    }
    
    return videoUrl;
  };
  
  // Extract YouTube video ID
  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };
  
  // Initialize YouTube API
  useEffect(() => {
    if (!isYoutube) return;
    
    // Load YouTube API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      
      window.onYouTubeIframeAPIReady = initYoutubePlayer;
    } else {
      initYoutubePlayer();
    }
    
    return () => {
      if (youtubePlayer) {
        youtubePlayer.destroy();
      }
    };
  }, [isYoutube, videoUrl]);
  
  // Initialize YouTube player
  const initYoutubePlayer = () => {
    if (!isYoutube || !window.YT || !window.YT.Player) return;
    
    const videoId = getYoutubeId(videoUrl);
    if (!videoId) return;
    
    if (youtubePlayer) {
      youtubePlayer.destroy();
    }
    
    const newPlayer = new window.YT.Player('youtube-player', {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        showinfo: 0,
        origin: window.location.origin
      },
      events: {
        onReady: (event: any) => {
          setYoutubePlayer(event.target);
          setReady(true);
          setLoading(false);
          event.target.setVolume(volume * 100);
          if (playing) event.target.playVideo();
        },
        onStateChange: (event: any) => {
          // YouTube states: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
          if (event.data === 1) {
            setBuffering(false);
            setPlaying(true);
          } else if (event.data === 2) {
            setPlaying(false);
          } else if (event.data === 3) {
            setBuffering(true);
          } else if (event.data === 0) {
            onComplete();
          }
        },
        onError: (event: any) => {
          console.error('YouTube player error:', event);
          setError('Error loading YouTube video. Please try again.');
        }
      }
    });
  };
  
  // Handle YouTube player controls
  useEffect(() => {
    if (!youtubePlayer) return;
    
    if (playing) {
      youtubePlayer.playVideo();
    } else {
      youtubePlayer.pauseVideo();
    }
  }, [playing, youtubePlayer]);
  
  useEffect(() => {
    if (!youtubePlayer) return;
    
    youtubePlayer.setVolume(muted ? 0 : volume * 100);
  }, [volume, muted, youtubePlayer]);
  
  // Track YouTube progress
  useEffect(() => {
    if (!youtubePlayer || !playing) return;
    
    const interval = setInterval(() => {
      if (youtubePlayer && youtubePlayer.getCurrentTime && youtubePlayer.getDuration) {
        const currentTime = youtubePlayer.getCurrentTime();
        const duration = youtubePlayer.getDuration();
        if (duration > 0) {
          const progress = currentTime / duration;
          setProgress(progress);
          setCurrentTime(currentTime);
          setDuration(duration);
          onProgress(progress);
          
          // Check for completion
          if (progress >= 0.95) {
            onComplete();
          }
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [playing, youtubePlayer]);
  
  // Handle HTML5 video initialization
  useEffect(() => {
    if (isYoutube) return;
    
    const video = videoRef.current;
    if (!video) return;
    
    const handleCanPlay = () => {
      setReady(true);
      setLoading(false);
      setRetryCount(0); // Reset retry count on successful load
      if (playing && isMounted.current) {
        video.play().catch(err => console.error('Play error:', err));
      }
    };
    
    const handleLoadStart = () => {
      setLoading(true);
      setReady(false);
    };
    
    const handleWaiting = () => {
      setBuffering(true);
    };
    
    const handlePlaying = () => {
      setBuffering(false);
      setLoading(false);
    };
    
    const handleEnded = () => {
      setPlaying(false);
      onComplete();
    };
    
    const handleError = async (e: any) => {
      console.error('Video error:', e);
      
      if (retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setError(`Loading video... Attempt ${retryCount + 1} of ${maxRetries}`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        handleReload();
      } else {
        setError('Unable to load video. Please check your connection and try again.');
      }
      setLoading(false);
    };
    
    const handleTimeUpdate = () => {
      if (video.duration) {
        const newProgress = video.currentTime / video.duration;
        setProgress(newProgress);
        setCurrentTime(video.currentTime);
        onProgress(newProgress);
      }
    };
    
    const handleDurationChange = () => {
      setDuration(video.duration);
    };
    
    // Add event listeners
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    
    // Clean up
    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
    };
  }, [isYoutube, videoUrl, retryCount]);
  
  // Handle URL changes
  useEffect(() => {
    if (urlRef.current === videoUrl) return;
    
    // Reset state when URL changes
    setPlaying(false);
    setReady(false);
    setLoading(true);
    setError(null);
    setProgress(0);
    setCurrentTime(0);
    setBuffering(false);
    setRetryCount(0);
    setSignedUrl(null);
    
    // Update ref
    urlRef.current = videoUrl;
    
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Set a timeout to show error if video doesn't load
    loadingTimeoutRef.current = window.setTimeout(() => {
      if (loading && !ready && !error) {
        setError('Video is taking too long to load. Please try again.');
      }
    }, 20000);
    
    // Initialize video URL
    if (!isYoutube) {
      getVideoUrl().catch(console.error);
    }
    
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [videoUrl]);
  
  // Handle play/pause
  useEffect(() => {
    if (isYoutube || !videoRef.current) return;
    
    if (playing && ready) {
      videoRef.current.play().catch(err => {
        console.error('Error playing video:', err);
        setPlaying(false);
      });
    } else if (videoRef.current) {
      videoRef.current.pause();
    }
  }, [playing, ready, isYoutube]);
  
  // Handle volume/mute
  useEffect(() => {
    if (isYoutube || !videoRef.current) return;
    
    videoRef.current.volume = volume;
    videoRef.current.muted = muted;
  }, [volume, muted, isYoutube]);
  
  // Component cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current || !containerRef.current.contains(document.activeElement)) return;
      
      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          setPlaying(prev => !prev);
          break;
        case 'm':
          setMuted(prev => !prev);
          break;
        case 'arrowleft':
          handleSeek(Math.max(0, currentTime - 10));
          break;
        case 'arrowright':
          handleSeek(Math.min(duration, currentTime + 10));
          break;
        case 'f':
          toggleFullscreen();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration]);
  
  // Format time (e.g., 1:23)
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle seeking
  const handleSeek = (time: number) => {
    if (isYoutube && youtubePlayer) {
      youtubePlayer.seekTo(time);
      return;
    }
    
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };
  
  // Handle progress bar click
  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    handleSeek(newTime);
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };
  
  // Reload video
  const handleReload = async () => {
    if (!isMounted.current) return;
    
    setError(null);
    setLoading(true);
    
    if (isYoutube && youtubePlayer) {
      youtubePlayer.loadVideoById(getYoutubeId(videoUrl));
      return;
    }
    
    if (videoRef.current) {
      const video = videoRef.current;
      const wasPlaying = playing;
      
      try {
        // Pause and reset the video first
        setPlaying(false);
        video.pause();
        video.currentTime = 0;
        
        // Get the new URL
        const newUrl = await getVideoUrl();
        
        // Load the new source
        video.src = newUrl;
        await video.load();
        
        // Wait for the loadedmetadata event
        await new Promise((resolve) => {
          const handleMetadata = () => {
            video.removeEventListener('loadedmetadata', handleMetadata);
            resolve(true);
          };
          video.addEventListener('loadedmetadata', handleMetadata);
        });
        
        // Only play if the component is still mounted and was playing before
        if (isMounted.current && wasPlaying) {
          setPlaying(true);
          await video.play();
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error reloading video:', err);
        setError('Failed to reload video. Please try again.');
        setLoading(false);
      }
    }
  };
  
  return (
    <div 
      ref={containerRef}
      className="relative aspect-video bg-black rounded-lg overflow-hidden group"
      tabIndex={0}
    >
      {/* YouTube player */}
      {isYoutube && (
        <div className="w-full h-full">
          <div id="youtube-player" className="w-full h-full"></div>
        </div>
      )}
      
      {/* HTML5 video player */}
      {!isYoutube && (
        <video
          ref={videoRef}
          src={signedUrl || videoUrl}
          className="w-full h-full object-contain"
          playsInline
          preload="auto"
          onContextMenu={(e) => e.preventDefault()}
          crossOrigin="anonymous"
        />
      )}
      
      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
          <div className="flex flex-col items-center">
            <Loader className="h-12 w-12 text-[#ff6600] animate-spin mb-4" />
            <p className="text-white text-sm">Loading video...</p>
          </div>
        </div>
      )}
      
      {/* Buffering indicator */}
      {buffering && !loading && (
        <div className="absolute bottom-16 right-4 bg-black/70 px-3 py-1 rounded-full z-10">
          <div className="flex items-center">
            <RefreshCw className="h-4 w-4 text-white animate-spin mr-2" />
            <span className="text-white text-xs">Buffering...</span>
          </div>
        </div>
      )}
      
      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
          <div className="max-w-md p-6 bg-gray-900 rounded-lg text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Video Error</h3>
            <p className="text-gray-300 mb-4">{error}</p>
            <Button onClick={handleReload}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Video
            </Button>
          </div>
        </div>
      )}
      
      {/* Play button overlay (when paused) */}
      {!playing && !loading && !error && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
          onClick={() => setPlaying(true)}
        >
          <div className="w-20 h-20 bg-[#ff6600]/80 rounded-full flex items-center justify-center">
            <Play className="h-10 w-10 text-white" />
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
        {/* Progress bar */}
        <div 
          ref={progressBarRef}
          className="h-1.5 bg-gray-600/60 rounded-full mb-4 cursor-pointer group/progress"
          onClick={handleProgressBarClick}
        >
          <div 
            className="h-full bg-[#ff6600] rounded-full relative"
            style={{ width: `${progress * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#ff6600] rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>
        
        {/* Controls row */}
        <div className="flex items-center justify-between">
          {/* Left controls */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPlaying(!playing)}
              disabled={loading}
              className="text-white hover:text-[#ff6600]"
            >
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSeek(0)}
              className="text-white hover:text-[#ff6600]"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMuted(!muted)}
                className="text-white hover:text-[#ff6600]"
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </Button>
              
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-16 accent-[#ff6600]"
              />
            </div>
            
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          
          {/* Right controls */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReload}
              className="text-white hover:text-[#ff6600]"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add TypeScript interface for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}