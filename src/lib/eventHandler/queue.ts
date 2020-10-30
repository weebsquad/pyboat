/* eslint-disable import/no-mutable-exports */
import * as utils from '../utils';
import * as routing from './routing';
import { logDebug } from '../../modules/logging/events/custom';
import { guildId } from '../../config';

export class QueuedEvent {
  id: string;
  eventName: string;
  payload: Array<any>;
  guildId: string | undefined = undefined;
  processed = false;
  verified = false;
  auditLogEntry: null | discord.AuditLogEntry.AnyAction | unknown = null;
  constructor(event: string, ...args: any) {
    this.id = utils.composeSnowflake();
    this.eventName = event;
    this.payload = args;
    this.guildId = guildId;
    return this;
  }
}

const cpuTimePerEvent = 20; // to determine when to use burst :P
const interval = 5000;

export let queue = new Array<QueuedEvent>();
// let timeout: any;
// const kv = new pylon.KVNamespace('loggingQueue');
let _lock: undefined | number;

export function getProcQueueSize() {
  let procQueue = new Array<QueuedEvent>().concat(queue);
  procQueue = procQueue.filter((e) => !e.processed);
  return procQueue.length;
}
export function checkLocks() {
  if (_lock !== undefined && typeof _lock === 'number') {
    const diff = new Date().getTime() - _lock;
    if (diff < interval) {
      return interval - diff;
    }
  }
  return true;
}
export async function resolveQueue() {
  if (checkLocks() !== true) {
    return false;
  }
  _lock = new Date().getTime();
  queue = cleanQueue(queue);
  let procQueue = new Array<QueuedEvent>().concat(queue);
  procQueue = procQueue.filter((e) => !e.processed);
  const len = procQueue.length;
  if (len < 1) {
    _lock = undefined;
    return false;
  }
  const usedCpu = 35;
  /* if (typeof (pylon.getCpuTime) === 'function') {
    usedCpu = (await pylon.getCpuTime());
  } */

  const neededCpuTime = Math.floor(cpuTimePerEvent * len);
  console.log(`Executing event queue of ${procQueue.length} events (${neededCpuTime}ms needed cpu)`);
  const cpuT = usedCpu + neededCpuTime;
  try {
    if (cpuT >= 3000) {
      const canFit = Math.min(
        procQueue.length - 1,
        Math.floor((3000 - usedCpu) / cpuTimePerEvent) - 1,
      );
      if (canFit > 0) {
        const _alt = procQueue.slice(0, canFit);
        try {
          await pylon.requestCpuBurst(async () => {
            await routing.ExecuteQueuedEvents(_alt);
            _alt.map((e) => {
              const _f = queue.findIndex((e2) => e.id === e2.id);
              const _f2 = procQueue.findIndex((e2) => e.id === e2.id);
              if (_f !== -1) {
                queue[_f] = e;
              }
              if (_f2 !== -1) {
                procQueue[_f2] = e;
              }
              return e;
            });
          }, 3000);
        } catch (e) {
          utils.logError(e);
        }
      }
    } else if (cpuT >= 100) {
      try {
        await pylon.requestCpuBurst(async () => {
          await routing.ExecuteQueuedEvents(procQueue);
        }, Math.max(200, cpuT));
      } catch (err) {
        utils.logError(err);
        if (
          !(err instanceof pylon.CpuBurstRequestError)
          && typeof err.bucketRemainingMs !== 'number'
        ) {
          const canFit = Math.min(
            procQueue.length - 1,
            Math.floor((100 - usedCpu) / cpuTimePerEvent) - 1,
          );
          if (canFit > 0) {
            const _alt = procQueue.slice(0, canFit);
            await routing.ExecuteQueuedEvents(_alt);
            _alt.map((e) => {
              const _f = queue.findIndex((e2) => e.id === e2.id);
              const _f2 = procQueue.findIndex((e2) => e.id === e2.id);
              if (_f !== -1) {
                queue[_f] = e;
              }
              if (_f2 !== -1) {
                procQueue[_f2] = e;
              }
              return e;
            });
          }
        } /*
        let remaining = e.bucketRemainingMs;
        let resetin = e.bucketResetInMs;
        if (remaining >= Math.floor(cpuT * 1.2)) {
          await pylon.requestCpuBurst(async function() {
            await routing.ExecuteQueuedEvents(queue);
          }, remaining - 1);
        } else {
          setTimeout(resetInterval, resetin - Math.min(15000, interval) + 1);
        } */
      }
    } else {
      await routing.ExecuteQueuedEvents(queue);
    }
  } catch (_e) {
    logDebug(
      'BOT_ERROR',
      new Map<string, any>([
        [
          'ERROR',
          `Error while executing event queue': \n${_e.stack}`,
        ],
      ]),
    );
  }
  procQueue.map((e) => {
    const _f = queue.findIndex((e2) => e.id === e2.id);
    if (_f === -1) {
      return e;
    }
    queue[_f] = e;
    return e;
  });
  _lock = new Date().getTime();
  return true;
}

export function cleanQueue(q: Array<QueuedEvent> | undefined = undefined) {
  if (q === undefined) {
    q = queue;
  }
  q = q.filter((e: QueuedEvent) => {
    if (e.processed) {
      const ts = new Date(utils.decomposeSnowflake(e.id).timestamp).getTime();
      const diff = new Date().getTime() - ts;
      if (e.verified && diff >= Math.floor(interval * 3)) {
        return false;
      } if (!e.verified && diff >= Math.floor(interval * 30)) {
        return false;
      }
    }
    return true;
  });
  return q;
}

async function resetInterval(retry = true) {
  const _r = checkLocks();
  if (_r === true) {
    setTimeout(resolveQueue, Math.ceil(interval / 2));
  } else {
    if (!retry) {
      return;
    }
    setTimeout(() => {
      resetInterval(false);
    }, _r);
  }
}

export async function addToQueue(eventName: string, ts: string, ...args: any) {
  const obj = new QueuedEvent(eventName, ...args);
  obj.id = ts;
  queue.push(obj);
  await resetInterval();
  return obj;
}
