import { Config } from 'payload/config';
import { CollectionConfig, CollectionBeforeChangeHook } from 'payload/types';
import * as path from 'path';
import sharp from 'sharp';
import { encode } from 'blurhash';
import { Minimatch } from 'minimatch';

export interface BlurhashPluginOptions {
  /*
   * Array of collection slugs that the plugin should apply to.
   * By default, the plugin will apply to all collections with `upload` properties.
   */
  collections?: CollectionConfig['slug'][];

  /*
   * Width to resize the image to prior to computing the blurhash.
   * Default: 32
   */
  width?: number;

  /*
   * Height to resize the image to prior to computing the blurhash.
   * Default: 32
   */
  height?: number;

  /*
   * X component count to pass to the Blurhash library.
   * Default: 3
   */
  componentX?: number;

  /*
   * Y component count to pass to the Blurhash library.
   * Default: 3
   */
  componentY?: number;

  /*
   * Pattern to determine which MIME types to target
   * Default: image/*
   */
  mimeTypePattern?: string;
}

const computeBlurhash = ({
  collections,
  width = 32,
  height = 32,
  componentX = 3,
  componentY = 3,
  mimeTypePattern = 'image/*',
}: BlurhashPluginOptions = {}) => {
  const mimeTypeMatcher = new Minimatch(mimeTypePattern);

  return (incomingConfig: Config): Config => {
    const hook: CollectionBeforeChangeHook = async ({ data, req }) => {
      if (!req.collection) {
        return data;
      }

      if (!mimeTypeMatcher.match(data.mimeType)) {
        return data;
      }

      const file = req.files?.file;
      if (file == null || !('data' in file)) {
        return data;
      }

      const fileData = file.data;
      if (!Buffer.isBuffer(fileData)) {
        return data;
      }

      const rawPixels = await sharp(fileData)
        .resize(width, height)
        .ensureAlpha(1)
        .raw()
        .toBuffer();

      const blurhash = encode(
        new Uint8ClampedArray(rawPixels),
        width,
        height,
        componentX,
        componentY,
      );

      return {
        ...data,
        blurhash,
      };
    };

    return {
      ...incomingConfig,
      collections:
        incomingConfig.collections?.map((collection) => {
          if (!collection.upload) {
            return collection;
          }

          if (collections && !collections.includes(collection.slug)) {
            return collection;
          }

          return {
            ...collection,
            fields: [
              ...collection.fields,
              {
                name: 'blurhash',
                type: 'text',
              },
            ],
            hooks: {
              ...collection.hooks,
              beforeChange: [...(collection.hooks?.beforeChange ?? []), hook],
            },
          };
        }) ?? [],
      admin: {
        ...incomingConfig.admin,
        webpack: (webpackConfig) => {
          const modifiedConfig = {
            ...webpackConfig,
            resolve: {
              ...webpackConfig.resolve,
              alias: {
                ...webpackConfig.resolve?.alias,
                'payload-blurhash-plugin': path.resolve(
                  __dirname,
                  './mock-plugin',
                ),
              },
            },
          };

          return (
            incomingConfig.admin?.webpack?.(modifiedConfig) ?? modifiedConfig
          );
        },
      },
    };
  };
};

export default computeBlurhash;
