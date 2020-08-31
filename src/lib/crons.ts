import * as ratelimit from './eventHandler/ratelimit';
import * as queue from './eventHandler/queue';
import { logDebug } from '../modules/logging/events/custom';
import * as conf from '../config';
import { every5Min } from '../modules/infractions';
import { cleanPool } from '../modules/translation';
import * as starboard from '../modules/starboard';
import * as censor from '../modules/censor';
import * as antiPing from '../modules/antiPing';
import { InitializedPools } from './storagePools';

const _cr: {[key: string]: any} = {
  '0 0/5 * * * * *': {
    name: 'every_5_min',
    async function() {
      try {
        await pylon.requestCpuBurst(async () => {
          if (InitializedPools.length > 0) {
            await Promise.all(InitializedPools.map(async (pool) => {
              await pool.clean();
            }));
          }
          let dt = Date.now();
          await ratelimit.clean();
          dt = Date.now();
          await cleanPool();
          dt = Date.now();
          queue.cleanQueue();
          dt = Date.now();
          await every5Min();
          dt = Date.now();
          await starboard.periodicClear();
          dt = Date.now();
          await censor.clean();
          dt = Date.now();
          await antiPing.periodicDataClear();
          throw new Error('');
        }, 300);
      } catch (e) {
        if (e.message !== '') {
          console.error(e);
        }
      }
    },
    started: false,
  },
};

async function onCron(name: string) {
  if (typeof conf.config === 'undefined') {
    const res = await conf.InitializeConfig();
    if (res === false || typeof conf.config === 'undefined') {
      return;
    }
  }
  for (const key in _cr) {
    if (_cr[key].name !== name) {
      continue;
    }
    /* logDebug(
      'CRON_RAN',
      new Map<string, any>([['CRON_NAME', name]]),
    ); */
    await _cr[key].function();
  }
}

export function InitializeCrons() {
  for (const key in _cr) {
    const obj = _cr[key];
    const nm = obj.name;
    if (obj.started === true) {
      continue;
    }
    if (typeof nm !== 'string' || !(obj.function instanceof Function)) {
      continue;
    }
    obj.started = true;
    pylon.tasks.cron(nm, key, async () => {
      await onCron(nm);
    });
  }
}
