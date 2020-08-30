import * as ratelimit from './eventHandler/ratelimit';
import * as queue from './eventHandler/queue';
import { logDebug } from '../modules/logging/events/custom';
import * as conf from '../config';
import { every5Min } from '../modules/infractions';
import { cleanPool } from '../modules/translation';
import * as starboard from '../modules/starboard';
import * as censor from '../modules/censor';
import * as antiSpam from '../modules/antiSpam';
import * as antiPing from '../modules/antiPing';

const _cr: {[key: string]: any} = {
  '0 0/5 * * * * *': {
    name: 'every_5_min',
    async function() {
      console.log('\n\nRunning cron');
      const now = Date.now();
      await pylon.requestCpuBurst(async () => {
        let dt = Date.now();
        await ratelimit.clean();
        // console.log(`Ratelimit clean took ${Date.now()-dt}ms // Total: ${Date.now()-now}`);
        dt = Date.now();
        await cleanPool();
        // console.log(`Translation clean took ${Date.now()-dt}ms // Total: ${Date.now()-now}`);
        dt = Date.now();
        queue.cleanQueue();
        // console.log(`Queue clean took ${Date.now()-dt}ms // Total: ${Date.now()-now}`);
        dt = Date.now();
        await every5Min();
        console.log(`Infractions clean took ${Date.now() - dt}ms // Total: ${Date.now() - now}`);
        dt = Date.now();
        await starboard.periodicClear();
        console.log(`Starboard clean took ${Date.now() - dt}ms // Total: ${Date.now() - now}`);
        dt = Date.now();
        await censor.clean();
        // console.log(`Censor clean took ${Date.now()-dt}ms // Total: ${Date.now()-now}`);
        dt = Date.now();
        await antiSpam.cleanPool();
        console.log(`AntiSpam clean took ${Date.now() - dt}ms // Total: ${Date.now() - now}`);
        dt = Date.now();
        await antiPing.periodicDataClear();
        console.log(`AntiPing clean took ${Date.now() - dt}ms // Total: ${Date.now() - now}`);
      }, 300);
      console.log(`Took ${Date.now() - now}ms to execute cron`);
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
    await logDebug(
      'CRON_RAN',
      new Map<string, any>([['CRON_NAME', name]]),
    );
    _cr[key].function();
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
