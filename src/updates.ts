/* eslint-disable @typescript-eslint/no-empty-function */
import { KVManager } from './lib/kvManager';

const configKv = new pylon.KVNamespace('config');

const updates = {
  '1.0.0': async () => {},
};
export async function runUpdates(oldVersion: string, newVersion: string) {
  const oldNumber = +(oldVersion.split('.').join(''));
  const newNumber = +(newVersion.split('.').join(''));
  const toRun: string[] = [];
  for (const key in updates) {
    const thisN = +(key.split('.').join(''));
    if (thisN > oldNumber && thisN <= newNumber) {
      toRun.push(key);
    }
  }
  if (toRun.length > 0) {
    const sorted = toRun.sort((a, b) => (+(a.split('.').join(''))) - (+(b.split('.').join(''))));
    console.info('Running updates!', sorted);
    for (const key in sorted) {
      await updates[sorted[key]]();
    }
  }

  await pylon.kv.put('__botVersion', newVersion);
}
