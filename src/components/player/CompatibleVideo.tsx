import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

export interface CompatibleVideoRef {
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoElement: () => HTMLVideoElement | null;
}

interface CompatibleVideoProps {
  src: string;
  poster?: string;
  onTimeUpdate?: (currentTime: number) => void;
  onLoadedMetadata?: (video: HTMLVideoElement) => void;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export const CompatibleVideo = forwardRef<CompatibleVideoRef, CompatibleVideoProps>(
  (
    {
      src,
      poster,
      onTimeUpdate,
      onLoadedMetadata,
      className = '',
      autoPlay = false,
      loop = false,
      muted = false,
      controls = true,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    useImperativeHandle(ref, () => ({
      play: async () => {
        if (videoRef.current) {
          try {
            await videoRef.current.play();
          } catch (e) {
            console.warn('视频自动播放被浏览器拦截:', e);
          }
        }
      },
      pause: () => {
        if (videoRef.current) videoRef.current.pause();
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getCurrentTime: () => videoRef.current?.currentTime || 0,
      getDuration: () => videoRef.current?.duration || 0,
      getVideoElement: () => videoRef.current,
    }));

    return (
      <div className="relative w-full h-full flex items-center justify-center bg-slate-900/90 rounded-2xl overflow-hidden shadow-inner">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className={`max-h-full max-w-full object-contain ${className}`}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          // 移动端 Safari 与安卓微信防全屏劫持必备核心属性
          playsInline
          // @ts-ignore
          webkit-playsinline="true"
          x5-video-player-type="h5-page"
          x5-video-orientation="portrait"
          preload="metadata"
          onTimeUpdate={() => {
            if (videoRef.current && onTimeUpdate) {
              onTimeUpdate(videoRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current && onLoadedMetadata) {
              onLoadedMetadata(videoRef.current);
            }
          }}
        />
      </div>
    );
  }
);

CompatibleVideo.displayName = 'CompatibleVideo';
