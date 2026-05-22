export type Rect = { x: number; y: number; width: number; height: number }
export type ImageFitMode = 'stretch' | 'fit' | 'fill'

export function imageFitRect(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number): Rect {
  const scale = Math.min(frameWidth / imageWidth, frameHeight / imageHeight)
  const width = Math.round(imageWidth * scale)
  const height = Math.round(imageHeight * scale)
  return {
    x: Math.round((frameWidth - width) / 2),
    y: Math.round((frameHeight - height) / 2),
    width,
    height,
  }
}

export function imageCoverCrop(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number): Rect {
  const imageRatio = imageWidth / imageHeight
  const frameRatio = frameWidth / frameHeight
  if (imageRatio > frameRatio) {
    const width = Math.round(imageHeight * frameRatio)
    return {
      x: Math.round((imageWidth - width) / 2),
      y: 0,
      width,
      height: imageHeight,
    }
  }
  const height = Math.round(imageWidth / frameRatio)
  return {
    x: 0,
    y: Math.round((imageHeight - height) / 2),
    width: imageWidth,
    height,
  }
}
