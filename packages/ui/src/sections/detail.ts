/** The arithmetic of a detail: which part of a print fills a frame. Pure, so it is tested alone. */

/** A point of the print to look at closely, in percent of its width and height, and how close. */
export interface Detail {
  readonly x: number;
  readonly y: number;
  /** 1 fills the frame with the whole print, as `object-fit: cover` would; 3 is three times closer. */
  readonly zoom: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Where the image goes so the point sits in the middle of the frame, as far
 * as the image's edges allow: its size and offset in percent of the frame.
 */
export function placement(
  image: { width: number; height: number },
  frame: number,
  { x, y, zoom }: Detail,
) {
  const ratio = image.width / image.height;
  // Cover first: the image's narrower side meets the frame. Then the zoom.
  const width = (frame >= ratio ? 1 : ratio / frame) * zoom * 100;
  const height = (frame >= ratio ? frame / ratio : 1) * zoom * 100;
  return {
    width,
    height,
    left: clamp(50 - (x / 100) * width, 100 - width, 0),
    top: clamp(50 - (y / 100) * height, 100 - height, 0),
  };
}
