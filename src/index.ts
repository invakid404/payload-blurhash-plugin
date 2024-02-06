import { Config } from 'payload/config';
import { CollectionConfig, CollectionBeforeChangeHook } from 'payload/types';
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
      if (!req.collection && req.payloadAPI !== "local") {
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
