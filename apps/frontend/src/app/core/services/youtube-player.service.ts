import { Injectable, signal } from '@angular/core';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
  }
}

@Injectable({
  providedIn: 'root',
})
export class YoutubePlayerService {
  private player: YT.Player | null = null;
  private apiReady = false;
  private pendingVideoId: string | null = null;
  private containerEl: HTMLElement | null = null;

  isPlaying = signal(false);
  isLoaded = signal(false);
  currentVideoId = signal<string | null>(null);

  constructor() {
    this.loadYouTubeAPI();
  }

  private loadYouTubeAPI(): void {
    if (window.YT && window.YT.Player) {
      this.apiReady = true;
      return;
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (existingScript) {
      window.onYouTubeIframeAPIReady = () => {
        this.apiReady = true;
        if (this.pendingVideoId && this.containerEl) {
          this.createPlayer(this.pendingVideoId, this.containerEl);
        }
      };
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;

    window.onYouTubeIframeAPIReady = () => {
      this.apiReady = true;
      if (this.pendingVideoId && this.containerEl) {
        this.createPlayer(this.pendingVideoId, this.containerEl);
      }
    };

    document.body.appendChild(script);
  }

  extractVideoId(url: string): string | null {
    if (!url) return null;

    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  play(youtubeUrl: string, containerElement: HTMLElement): void {
    console.log('[YouTubePlayer] play() called with URL:', youtubeUrl);
    const videoId = this.extractVideoId(youtubeUrl);
    if (!videoId) {
      console.warn('[YouTubePlayer] Invalid YouTube URL:', youtubeUrl);
      return;
    }

    console.log('[YouTubePlayer] Extracted video ID:', videoId);
    this.currentVideoId.set(videoId);
    this.containerEl = containerElement;

    if (!this.apiReady) {
      console.log('[YouTubePlayer] API not ready, queuing video');
      this.pendingVideoId = videoId;
      return;
    }

    console.log('[YouTubePlayer] API ready, creating player');
    this.createPlayer(videoId, containerElement);
  }

  private createPlayer(videoId: string, container: HTMLElement): void {
    // Destroy existing player
    this.destroyPlayer();

    // Create a div for the player
    const playerDiv = document.createElement('div');
    playerDiv.id = 'yt-bg-player';
    container.appendChild(playerDiv);

    this.player = new window.YT.Player('yt-bg-player', {
      videoId,
      width: '1',
      height: '1',
      playerVars: {
        autoplay: 1,
        loop: 1,
        playlist: videoId, // Required for loop to work
        controls: 0,
        showinfo: 0,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: (event: YT.PlayerEvent) => {
          console.log('[YouTubePlayer] Player ready');
          // Use device default volume (100%)
          event.target.playVideo();
          this.isLoaded.set(true);
          this.isPlaying.set(true);
        },
        onStateChange: (event: YT.OnStateChangeEvent) => {
          console.log('[YouTubePlayer] State changed:', event.data);
          if (event.data === YT.PlayerState.PLAYING) {
            this.isPlaying.set(true);
          } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
            this.isPlaying.set(false);
          }
        },
        onError: (event: YT.OnErrorEvent) => {
          console.error('[YouTubePlayer] Error:', event.data);
          this.isPlaying.set(false);
        },
      },
    });

    this.pendingVideoId = null;
  }

  stop(): void {
    if (this.player) {
      try {
        this.player.stopVideo();
      } catch {
        // Player might be destroyed
      }
    }
    this.isPlaying.set(false);
  }

  pause(): void {
    if (this.player) {
      try {
        this.player.pauseVideo();
      } catch {
        // Player might be destroyed
      }
    }
    this.isPlaying.set(false);
  }

  resume(): void {
    if (this.player) {
      try {
        this.player.playVideo();
      } catch {
        // Player might be destroyed
      }
    }
  }

  setVolume(volume: number): void {
    if (this.player) {
      try {
        this.player.setVolume(Math.max(0, Math.min(100, volume)));
      } catch {
        // Player might be destroyed
      }
    }
  }

  mute(): void {
    if (this.player) {
      try {
        this.player.mute();
      } catch {
        // Player might be destroyed
      }
    }
  }

  unmute(): void {
    if (this.player) {
      try {
        this.player.unMute();
      } catch {
        // Player might be destroyed
      }
    }
  }

  isMuted(): boolean {
    if (this.player) {
      try {
        return this.player.isMuted();
      } catch {
        return false;
      }
    }
    return false;
  }

  destroyPlayer(): void {
    if (this.player) {
      try {
        this.player.destroy();
      } catch {
        // Already destroyed
      }
      this.player = null;
    }

    // Remove the player div
    const playerDiv = document.getElementById('yt-bg-player');
    if (playerDiv) {
      playerDiv.remove();
    }

    this.isPlaying.set(false);
    this.isLoaded.set(false);
    this.currentVideoId.set(null);
  }
}
