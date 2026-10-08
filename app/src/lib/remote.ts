import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

type Subscription = { remove: () => void };

type BirchRemoteModule = {
  setEnabled(next: boolean, previous: boolean): void;
  addListener(event: 'onNext' | 'onPrevious', cb: () => void): Subscription;
};

const mod = Platform.OS === 'ios' ? requireOptionalNativeModule<BirchRemoteModule>('BirchRemote') : null;

export function bindRemote(handlers: { next: () => void; previous: () => void }) {
  if (!mod) return () => {};
  const a = mod.addListener('onNext', handlers.next);
  const b = mod.addListener('onPrevious', handlers.previous);
  return () => {
    a.remove();
    b.remove();
  };
}

export function setRemoteEnabled(next: boolean, previous: boolean) {
  mod?.setEnabled(next, previous);
}
