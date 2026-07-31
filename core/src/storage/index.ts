import { StorageProvider } from './types.js';
import { s3Provider } from './s3.js';
import { localProvider } from './local.js';

const mode = process.env.STORAGE_MODE || 's3';

function createProvider(): StorageProvider {
  switch (mode) {
    case 'local':
      return localProvider;
    case 's3':
    default:
      return s3Provider;
  }
}

export const storage: StorageProvider = createProvider();
