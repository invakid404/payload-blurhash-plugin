import type {
  Config,
  CollectionConfig,
  CollectionBeforeChangeHook,
} from 'payload';
import * as path from 'path';
import { Minimatch } from 'minimatch';
import { AlgorithmOptions, defaultAlgorithm, runAlgorithm } from './algorithms';

export type BlurhashPluginOptions = {
  /*
   * Array of collection slugs that the plugin should apply to.
   * By default, the plugin will apply to all collections with `upload` properties.
   */
  collections?: CollectionConfig['slug'][];

  /*
   * Pattern to determine which MIME types to target
   * Default: image/*
   */
  mimeTypePattern?: string;
} & AlgorithmOptions;

const computeBlurhash = (pluginOptions?: BlurhashPluginOptions) => {
  const {
    collections,
    mimeTypePattern = 'image/*',
    algorithm = defaultAlgorithm,
    ...options
  } = pluginOptions ?? {};

  const mimeTypeMatcher = new Minimatch(mimeTypePattern);

  return (incomingConfig: Config): Config => {
    const hook: CollectionBeforeChangeHook = async ({ data, req }) => {
      if (!mimeTypeMatcher.match(data.mimeType)) {
        return data;
      }

      const file = req.file;
      if (file == null || !('data' in file)) {
        return data;
      }

      const fileData = file.data;
      if (!Buffer.isBuffer(fileData)) {
        return data;
      }

      const blurhash = await runAlgorithm(algorithm, fileData, options);

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
                admin: {
                  hidden: true
                }
              },
            ],
            hooks: {
              ...collection.hooks,
              beforeChange: [...(collection.hooks?.beforeChange ?? []), hook],
            },
          };
        }) ?? [],
    };
  };
};

export default computeBlurhash;
