"use client";

import { useState, useRef, useCallback } from "react";
import ReactCrop, { centerCrop, makeAspectCrop, type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  src: string; // object URL of the selected file
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  /** "image/jpeg" (default, matches existing photo-upload behavior) or "image/png"
   *  to preserve transparency outside the circular crop instead of flattening it
   *  to a solid fill. */
  format?: "image/jpeg" | "image/png";
  title?: string;
}

function centerAspectCrop(width: number, height: number, aspect: number): Crop {
  return centerCrop(
    makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height),
    width,
    height
  );
}

export function PhotoCropDialog({ open, src, onConfirm, onCancel, format = "image/jpeg", title = "Crop Photo" }: Props) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  async function handleConfirm() {
    if (!imgRef.current || !completedCrop) return;
    setProcessing(true);
    try {
      const blob = await cropToBlob(imgRef.current, completedCrop, format);
      onConfirm(blob);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <p className="text-sm text-muted-foreground">Drag to reposition · Resize handles at the corners</p>
        </DialogHeader>

        <div className="flex justify-center max-h-[60vh] overflow-auto">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            minWidth={80}
            minHeight={80}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={onImageLoad}
              style={{ maxHeight: "55vh", maxWidth: "100%", objectFit: "contain" }}
            />
          </ReactCrop>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={processing}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={processing || !completedCrop}>
            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Use this photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function cropToBlob(img: HTMLImageElement, crop: PixelCrop, format: "image/jpeg" | "image/png"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const scaleX = img.naturalWidth / img.width;
  const scaleY = img.naturalHeight / img.height;

  const size = 400; // output size in px
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d")!;

  // Circular clip — for PNG the canvas is transparent by default, so the area
  // outside the circle stays transparent; for JPEG (no alpha channel) the browser
  // flattens it to a solid fill, which is invisible anyway since every current
  // display spot re-clips to a circle with CSS.
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  ctx.drawImage(
    img,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => { if (blob) resolve(blob); else reject(new Error("Canvas toBlob failed")); },
      format,
      format === "image/jpeg" ? 0.9 : undefined
    );
  });
}
