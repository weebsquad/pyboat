import * as ratelimit from './eventHandler/ratelimit';
import * as queue from './eventHandler/queue';
import { logDebug } from '../modules/logging/events/custom';
import * as conf from '../config';
import { every5Min } from '../modules/infractions';
import { cleanPool } from '../modules/translation';
import * as starboard from '../modules/starboard';
import * as censor from '../modules/censor';
import * as antiSpam from '../modules/antiSpam'

const _cr: {[key: string]: any} = {
  '0 0/5 * * * * *': {
    name: 'every_5_min',
    async function() {
      const now = Date.now();
      await pylon.requestCpuBurst(async function() {
        await ratelimit.clean();
        await cleanPool();
        queue.cleanQueue();
        await every5Min();
        await starboard.periodicClear();
        await censor.clean();
        await antiSpam.cleanPool();
      });
      console.log(`Took ${Date.now()-now}ms to execute cron`);
    },
    started: false,
  },
};

async function onCron(name: string) {
  for (const key in _cr) {
    if (_cr[key].name !== name) {
      continue;
    }
    if (typeof conf.config === 'undefined') {
      const res = await conf.InitializeConfig();
      if (res === false) {
        return;
      }
    }
    await _cr[key].function();
    await logDebug(
      'CRON_RAN',
      new Map<string, any>([['CRON_NAME', name]]),
    );
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
