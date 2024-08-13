import { buildConfig } from 'payload';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import computeBlurhash from '@payload-plugin-blurhash';

export default buildConfig({
  collections: [
    {
      slug: 'users',
      auth: true,
      fields: [],
    },
    {
      slug: 'media',
      upload: true,
      fields: [],
    },
  ],
  secret: 'secret',
  db: mongooseAdapter({
    url: 'mongodb://localhost:27017/payload-blurhash-plugin',
  }),
  plugins: [
    computeBlurhash({
      collections: ['media'],
    }),
  ],
});
