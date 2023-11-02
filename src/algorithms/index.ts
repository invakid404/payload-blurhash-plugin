import { imageToBlurhash, BlurhashOptionsSchema } from './blurhash';
import { imageToThumbhash, ThumbhashOptionsSchema } from './thumbhash';
import { z } from 'zod';
import { Equal, ExpectTrue } from '../types';

export type Algorithm = (
  data: Buffer,
  options: Record<string, unknown>,
) => Promise<string>;

type ExtractAlgorithmOptions<T extends Algorithm> = Parameters<T>[1];

export const algorithms = {
  blurhash: [imageToBlurhash, BlurhashOptionsSchema] as const,
  thumbhash: [imageToThumbhash, ThumbhashOptionsSchema] as const,
};

type Algorithms = typeof algorithms;

type AlgorithmValidity = {
  [Key in keyof Algorithms]: Algorithms[Key] extends readonly [
    infer Algo extends Algorithm,
    infer Schema extends z.AnyZodObject,
  ]
    ? Equal<ExtractAlgorithmOptions<Algo>, z.infer<Schema>>
    : false;
};

type EnsureAlgorithmValidity = ExpectTrue<
  AlgorithmValidity[keyof AlgorithmValidity]
>;

type AlgorithmType = keyof Algorithms;

export const defaultAlgorithm = 'blurhash' satisfies AlgorithmType;

type DefaultAlgorithm = typeof defaultAlgorithm;

const isAlgorithmType = (type: string): type is AlgorithmType =>
  type in algorithms;

export type AlgorithmOptions = {
  [Key in keyof Algorithms]: Algorithms[Key] extends readonly [
    infer Algo extends Algorithm,
    ...unknown[],
  ]
    ? (Key extends DefaultAlgorithm
        ? { algorithm?: Key }
        : { algorithm: Key }) &
        ExtractAlgorithmOptions<Algo>
    : never;
}[keyof Algorithms];

export const runAlgorithm = (
  algorithmType: string,
  data: Buffer,
  options: Record<string, unknown>,
) => {
  if (!isAlgorithmType(algorithmType)) {
    throw new Error(`Unknown algorithm: ${algorithmType}`);
  }

  const [algorithm, schema] = algorithms[algorithmType];
  const parsedOptions = schema.parse(options);

  return algorithm(data, parsedOptions);
};
