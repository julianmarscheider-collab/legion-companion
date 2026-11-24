import { Capacitor } from '@capacitor/core';

/**
 * Platform-independent photo capture. In the browser the UI uses the
 * <CameraCapture> component (webcam or file upload). Inside the Android app
 * the native camera / gallery is used via Capacitor.
 */
export const isNative = () => Capacitor.isNativePlatform();

export async function takeNativePhoto(): Promise<string | null> {
  const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
  try {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
      quality: 80,
      width: MAX_SIZE,
    });
    return photo.dataUrl ? compressImage(photo.dataUrl) : null;
  } catch {
    return null; // user cancelled
  }
}

const MAX_SIZE = 1024;

/** Downscale and JPEG-encode an image so it stays small in the database. */
export async function compressImage(src: string | Blob | HTMLVideoElement): Promise<string> {
  let source: CanvasImageSource;
  let w: number;
  let h: number;
  if (src instanceof HTMLVideoElement) {
    source = src;
    w = src.videoWidth;
    h = src.videoHeight;
  } else {
    const img = new Image();
    img.src = typeof src === 'string' ? src : URL.createObjectURL(src);
    await img.decode();
    source = img;
    w = img.naturalWidth;
    h = img.naturalHeight;
  }
  const scale = Math.min(1, MAX_SIZE / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}
