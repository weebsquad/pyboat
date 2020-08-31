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
      const dt = Date.now();
      try {
        await pylon.requestCpuBurst(async () => {
          if (InitializedPools.length > 0) {
            await Promise.all(InitializedPools.map(async (pool) => {
              await pool.clean();
            }));
          }
          await ratelimit.clean();
          await cleanPool();
          queue.cleanQueue();
          await every5Min();
          await starboard.periodicClear();
          await censor.clean();
          await antiPing.periodicDataClear();
          throw new Error('');
        }, 300);
      } catch (e) {
        if (e.message !== '') {
          console.error(e);
        }
      }
      console.log(`Took ${Date.now() - dt}ms to run cron`);
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
