import { useEffect, useRef, useState } from 'react';
import { compressImage } from '../platform/camera';

/** Browser camera dialog: live webcam preview with a file-upload fallback. */
export function CameraCapture({ onCapture, onClose }: { onCapture(dataUrl: string): void; onClose(): void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser has no camera access here. You can upload an image file instead.');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        setError(null);
        if (video.current) video.current.srcObject = s;
      })
      .catch(() => setError('Could not open the camera (no camera, or permission denied). You can upload an image file instead.'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  const capture = async () => {
    if (video.current?.videoWidth) onCapture(await compressImage(video.current));
  };
  const upload = async (file?: File) => {
    if (file) onCapture(await compressImage(file));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <h2>Add image</h2>
        {error ? <p className="muted">{error}</p> : <video ref={video} autoPlay playsInline muted className="camera-preview" />}
        <div className="row gap wrap">
          {!error && (
            <>
              <button className="primary" onClick={capture}>
                📷 Capture
              </button>
              <button onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))}>Switch camera</button>
            </>
          )}
          <label className="button">
            Upload file
            <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <button className="ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
