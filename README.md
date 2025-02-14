# payload-blurhash-plugin

Payload CMS plugin for automatic Blurhash encoding of images.

## Getting started

1. Install the package

- Payload v2: `npm i payload-blurhash-plugin@2`
- Payload v3: `npm i payload-blurhash-plugin@3`

2. Add the plugin to your `payload.config.ts`:

```ts
import computeBlurhash from 'payload-blurhash-plugin';

export default buildConfig({
  /* ... */
  plugins: [computeBlurhash()],
});
```

## Plugin options

Optionally, you can pass the following options to tweak the behavior of the
plugin:

```ts
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

  /*
   * Whether to show the Blurhash field when viewing media items in the admin interface.
   * Default: false
   */
  showBlurhashField?: boolean;
} & AlgorithmOptions;
```

The `AlgorithmOptions` depend on which algorithm you are using. Currently, there
are two algorithms available: "blurhash" (the default) and "thumbhash". You can
select an algorithm by specifying the algorithm name under the `algorithm` key.

These are the options for the "blurhash" algorithm:

```ts
type BlurhashOptions = {
  // Default: 32
  width?: number | undefined;
  // Default: 32
  height?: number | undefined;
  // Default: 3
  componentX?: number | undefined;
  // Default: 3
  componentY?: number | undefined;
};
```

There are currently no options for the "thumbhash" algorithm.

The defaults are chosen somewhat arbitrarily, they are just values that I've
found to work nicely for me.
