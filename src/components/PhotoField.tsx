import { useState } from 'react';
import { isNative, takeNativePhoto } from '../platform/camera';
import { CameraCapture } from './CameraCapture';

/**
 * One image per asset (unit or map tile). It is stored in the `photos` array
 * so existing data keeps working; only the first entry is used, and adding or
 * removing the image leaves at most one.
 */
export function PhotoField({ photos, onChange }: { photos: string[]; onChange(photos: string[]): void }) {
  const [open, setOpen] = useState(false);
  const image = photos[0];
  const pick = async () => {
    if (isNative()) {
      const p = await takeNativePhoto();
      if (p) onChange([p]);
    } else setOpen(true);
  };
  return (
    <fieldset className="photos">
      <legend>Image</legend>
      <div className="row gap wrap">
        {image ? (
          <>
            <div className="photo">
              <img src={image} alt="" />
              <button className="remove" title="Remove image" aria-label="Remove image" onClick={() => onChange([])}>
                ×
              </button>
            </div>
            <button onClick={pick}>Replace image</button>
          </>
        ) : (
          <button className="add-photo" onClick={pick}>
            + Add image
          </button>
        )}
      </div>
      {open && (
        <CameraCapture
          onClose={() => setOpen(false)}
          onCapture={(p) => {
            onChange([p]);
            setOpen(false);
          }}
        />
      )}
    </fieldset>
  );
}
