// @flow
import type { ConversionType } from '../types/conversion-types';
import { convertThreadID } from './thread-utils';

function createOpenSocketFunction(baseURL: string): () => WebSocket {
  const [protocol, address] = baseURL.split('://');
  const prefix = protocol === 'https' ? 'wss' : 'ws';
  const endpoint = `${prefix}://${address}/ws`;
  return () => new WebSocket(endpoint);
}

function convertHashes<T>(
  hashes: {
    +[key: string]: T,
  },
  conversionType: ConversionType,
): { +[key: string]: T } {
  const result: { [key: string]: T } = {};
  Object.keys(hashes).forEach(key => {
    if (key.startsWith('threadInfo|')) {
      const threadID = key.substr(key.indexOf('|') + 1);
      result[`threadInfo|${convertThreadID(threadID, conversionType)}`] =
        hashes[key];
    } else {
      result[key] = hashes[key];
    }
  });
  return result;
}

export { createOpenSocketFunction, convertHashes };
