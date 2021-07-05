/* eslint-disable @typescript-eslint/no-empty-function */
import { KVManager } from './lib/kvManager';
import { StoragePool } from './lib/storagePools';
import { Infraction } from './modules/infractions';

const configKv = new pylon.KVNamespace('config');

export const updates = {
  '1.7.14': async () => {
    // remove Infractions.guild
    const infsPool = new StoragePool({
      name: 'infractions',
      idProperty: 'id',
      local: false,
      timestampProperty: 'ts',
    });
    const items = await infsPool.getAll<Infraction>(undefined, false);
    const toRemove = [];
    items.forEach((inf) => {
      // @ts-ignore
      if (inf.guild) {
        toRemove.push(inf.id);
      }
    });
    if (toRemove.length > 0) {
      await infsPool.editPools<Infraction>(toRemove, (inf) => {
        // @ts-ignore
        inf.guild = undefined;
        return inf;
      });
    }
  },
  '1.0.0': async () => {},
};
/**
 * Runs bot updates as long as:
 * Update # is bigger than the bot's old version
 * Update # is smaller (or equal) to the bot's new version
 * example: Update "1.2.0" would run when the bot goes from "1.1.9" to "1.2.0"
 * @param oldVersion Prior version
 * @param newVersion New version
 */
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
