import * as ratelimit from './eventHandler/ratelimit';
import * as queue from './eventHandler/queue';
import { logDebug } from '../modules/logging/events/custom';

let _cr = <any>{
  '0 0/5 * * * * *': {
    name: 'every_5_min',
    function: async function() {
      await ratelimit.clean();
      queue.cleanQueue();
    },
    started: false
  }
};

async function onCron(name: string) {
  for (var key in _cr) {
    if (_cr[key].name !== name) continue;
    await _cr[key].function();
    await logDebug(
      'CRON_RAN',
      new Map<string, any>([['CRON_NAME', name]])
    );
  }
}

export function InitializeCrons() {
  for (var key in _cr) {
    let obj = _cr[key];
    const nm = obj.name;
    if(obj.started === true) continue;
    if (typeof nm !== 'string' || !(obj.function instanceof Function)) continue;
    obj.started = true;
    pylon.tasks.cron(nm, key, async function() {
      await onCron(nm);
    });
    //console.log('initialized cron ', nm);
  }
}