import { Config } from 'payload/config';
import { CollectionConfig } from 'payload/types';
import { BeforeChangeHook } from 'payload/dist/globals/config/types';
import * as path from 'path';
import sharp from 'sharp';
import { encode } from 'blurhash';
import { Payload } from 'payload';
import { Collection } from 'payload/dist/collections/config/types';

const getMediaDirectory = (payload: Payload, collection: Collection) => {
  const staticDir = collection.config.upload.staticDir;

  if (path.isAbsolute(staticDir)) {
    return staticDir;
  }

  const configDir = payload.config.paths.configDir;

  return path.join(configDir, staticDir);
};

export interface BlurhashPluginOptions {
  collections?: CollectionConfig['slug'][];
  width?: number;
  height?: number;
  componentX?: number;
  componentY?: number;
}

const computeBlurhash =
  ({
    collections,
    width = 32,
    height = 32,
    componentX = 3,
    componentY = 3,
  }: BlurhashPluginOptions = {}) =>
  (incomingConfig: Config): Config => {
    const hook =
      (collectionSlug: string): BeforeChangeHook =>
      async ({ data, req }) => {
        const mediaDir = getMediaDirectory(req.payload, req.collection);
        const filepath = path.join(mediaDir, data.filename);

        const rawPixels = await sharp(filepath)
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
              beforeChange: [
                ...(collection.hooks?.beforeChange ?? []),
                hook(collection.slug),
              ],
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
                'payload-blurhash': path.resolve(__dirname, './mock-plugin'),
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

export default computeBlurhash;
