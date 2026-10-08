import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { StateStorage } from 'zustand/middleware';

const isWeb = Platform.OS === 'web';

function stateDir() {
  const dir = new Directory(Paths.document, 'state');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export const fileStorage: StateStorage = {
  getItem: async (name) => {
    if (isWeb) return globalThis.localStorage?.getItem(name) ?? null;
    const f = new File(stateDir(), `${name}.json`);
    if (!f.exists) return null;
    return f.text();
  },
  setItem: async (name, value) => {
    if (isWeb) {
      globalThis.localStorage?.setItem(name, value);
      return;
    }
    const tmp = new File(stateDir(), `${name}.json.tmp`);
    tmp.write(value);
    const target = new File(stateDir(), `${name}.json`);
    if (target.exists) target.delete();
    tmp.moveSync(target);
  },
  removeItem: async (name) => {
    if (isWeb) {
      globalThis.localStorage?.removeItem(name);
      return;
    }
    const f = new File(stateDir(), `${name}.json`);
    if (f.exists) f.delete();
  },
};
