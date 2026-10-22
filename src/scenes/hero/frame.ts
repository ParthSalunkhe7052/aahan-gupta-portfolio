/**
 * The Home composition lives in the 1920×1080 frame of the fire video.
 * World units in the hero scene are frame pixels, origin at the frame centre, y up.
 */
export const FRAME = { w: 1920, h: 1080 } as const;

/** Poster rectangle inside the video frame (measured from frame 0, see scripts/build-media.ts). */
export const POSTER = { x: 303, y: 194, w: 1063, h: 688 } as const;

/** Poster centre in world units. */
export const POSTER_CENTER = {
  x: POSTER.x + POSTER.w / 2 - FRAME.w / 2,
  y: FRAME.h / 2 - (POSTER.y + POSTER.h / 2),
} as const;

/** Vertical field of view of the hero camera, and the distance that makes 1 unit = 1 frame pixel at z = 0. */
export const FOV = 30;
export const CAMERA_Z = FRAME.h / 2 / Math.tan(((FOV / 2) * Math.PI) / 180);

export const MEDIA = {
  poster: '/media/home/poster.webp',
  still: '/media/home/frame0.jpg',
  video1080: '/media/video/painting-on-fire-1080.mp4',
  video720: '/media/video/painting-on-fire-720.mp4',
  webm1080: '/media/video/painting-on-fire-1080.webm',
} as const;

/** H.264 where supported (smallest decode cost), VP9 for builds without it. */
export function pickVideoSrc(probe: HTMLVideoElement, wide: boolean): string {
  if (probe.canPlayType('video/mp4; codecs="avc1.640028"')) return wide ? MEDIA.video1080 : MEDIA.video720;
  if (probe.canPlayType('video/webm; codecs="vp9"')) return MEDIA.webm1080;
  return MEDIA.video720;
}

/** Moments in the 6 s video (seconds): flames appear, the poster is mostly gone, the frame is black. */
export const VIDEO_CUES = { ignite: 0.85, consumed: 4.6, end: 5.9 } as const;
