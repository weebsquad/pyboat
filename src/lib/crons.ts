import * as ratelimit from './eventHandler/ratelimit';
import * as queue from './eventHandler/queue';
import * as conf from '../config';
import * as infractions from '../modules/infractions';
import * as translation from '../modules/translation';
import * as admin from '../modules/admin';
import * as starboard from '../modules/starboard';
import * as censor from '../modules/censor';
import * as antiPing from '../modules/antiPing';
import * as utilities from '../modules/utilities';
import { InitializedPools } from './storagePools';
import * as routing from './eventHandler/routing';
import * as reddit from '../modules/reddit';
import * as internal from '../modules/internal';
import { logError } from './utils';

const _cr: {[key: string]: any} = {
  '0 0 * * * * *': {
    name: 'every_hour',
    async function() {
      await conf.InitializeConfig(true);
    },
    started: false,
  },
  '0 0/5 * * * * *': {
    name: 'every_5_min',
    async function() {
      try {
        await pylon.requestCpuBurst(async () => {
          await ratelimit.clean();
          await translation.cleanPool();
          queue.cleanQueue();
          await admin.every5Min();
          await infractions.every5Min();
          await starboard.periodicClear();
          await antiPing.periodicDataClear();
          await utilities.checkReminders();
          await utilities.checkAllCustomRoles();
          await reddit.updateSubs();
          await internal.checkInactiveGuilds();
          await internal.sendBotUsers();
          if (InitializedPools.length > 0) {
            await Promise.all(InitializedPools.map(async (pool) => {
              await pool.clean();
            }));
          }
          throw new Error('');
        }, 300);
      } catch (e) {
        if (e.message !== '') {
          await logError(e);
        }
      }
    },
    started: false,
  },
};

export async function onCron(name: string) {
  if (typeof conf.config === 'undefined') {
    const res = await conf.InitializeConfig();
    if (!res) {
      return;
    }
  }
  await routing._Initialize();
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
