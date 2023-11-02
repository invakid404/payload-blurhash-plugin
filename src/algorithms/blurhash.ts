import sharp from 'sharp';
import { encode } from 'blurhash';
import { z } from 'zod';

export const BlurhashOptionsSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  componentX: z.number().optional(),
  componentY: z.number().optional(),
});

export type BlurhashOptions = z.infer<typeof BlurhashOptionsSchema>;

export const imageToBlurhash = async (
  data: Buffer,
  options: BlurhashOptions,
) => {
  const { width = 32, height = 32, componentX = 3, componentY = 3 } = options;

  const rawPixels = await sharp(data)
    .resize(width, height)
    .ensureAlpha(1)
    .raw()
    .toBuffer();

  return encode(
    new Uint8ClampedArray(rawPixels),
    width,
    height,
    componentX,
    componentY,
  );
};
