/* eslint-disable @typescript-eslint/ban-types */
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
import { executeCrons } from '../modules/customCode';
import { logError } from './utils';

type CronJob = {
  name: string
  function: Function;
  started: boolean;
}
export const crons: {[key: string]: CronJob} = {
  '0 0 * * * * *': {
    name: 'every_hour',
    async function() {
      try {
        await conf.InitializeConfig();
        await starboard.periodicClear();
        await antiPing.periodicDataClear();
        await internal.checkInactiveGuilds();
        await internal.sendBotUsers();
      } catch (e) {
        logError(e);
      }
    },
    started: false,
  },
  '0 0/5 * * * * *': {
    name: 'every_5_min',
    async function() {
      try {
        await pylon.requestCpuBurst(async () => {
          await conf.InitializeConfig();
          await ratelimit.clean();
          await translation.cleanPool();
          queue.cleanQueue();
          await admin.every5Min();
          await infractions.every5Min();

          await utilities.checkReminders();
          await utilities.checkAllCustomRoles();

          // @ts-ignore
          // const redditmeas = await pylon.getCpuTime();
          await reddit.updateSubs();
          // @ts-ignore
          // console.log(`Started Reddit update @${Math.floor(redditmeas)}ms and took ${Math.floor(await pylon.getCpuTime() - redditmeas)}ms to complete.`);

          // @ts-ignore
          // const poolmeas = await pylon.getCpuTime();
          // @ts-ignore
          // console.log('Cron about to clean pools, at ', Math.floor(await pylon.getCpuTime()), 'ms');
          if (InitializedPools.length > 0) {
            await Promise.all(InitializedPools.map(async (pool) => {
              await pool.clean();
            }));
          }
          // @ts-ignore
          // console.log(`Done pool cleaning @${Math.floor(poolmeas)}ms and took ${Math.floor(await pylon.getCpuTime() - poolmeas)}ms to complete.`);
          throw new Error('');
        }, 500);
      } catch (e) {
        if (e.message !== '') {
          logError(e);
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
  for (const key in crons) {
    if (crons[key].name !== name) {
      continue;
    }
    await crons[key].function();
    // generic global customCode execution
    if (routing.isModuleEnabled('customCode')) {
      await executeCrons(name);
    }
  }
}

export function cronExists(name: string): boolean {
  name = name.toLowerCase();
  for (const key in crons) {
    if (crons[key].name.toLowerCase() === name) {
      return true;
    }
  }
  return false;
}

export function InitializeCrons() {
  for (const key in crons) {
    const obj = crons[key];
    const nm = obj.name;
    if (obj.started === true) {
      continue;
    }
    if (typeof nm !== 'string' || !(obj.function instanceof Function)) {
      continue;
    }
    obj.started = true;
    pylon.tasks.cron(nm, key, async () => {
      console.log(`Native cron function executed for [${nm}] (${key})`);
      await onCron(nm);
    });
  }
}
