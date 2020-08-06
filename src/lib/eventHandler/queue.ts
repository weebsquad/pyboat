import * as utils from '../utils';
import * as routing from './routing';
import { logDebug } from '../../modules/logging/events/custom';

export class QueuedEvent {
  id: string;
  eventName: string;
  payload: Array<any>;
  guildId: string | undefined = undefined;
  processed: boolean = false;
  verified: boolean = false;
  auditLogEntry: null | discord.AuditLogEntry.AnyAction | Object = null;
  constructor(event: string, ...args: any) {
    this.id = utils.composeSnowflake();
    this.eventName = event;
    this.payload = args;
  }
}

const cpuTimePerEvent = 8; // to determine when to use burst :P
const interval = 5000;
const maxEventRuntime = 16000;
let queue = new Array<QueuedEvent>();
// let timeout: any;
// const kv = new pylon.KVNamespace('loggingQueue');
let _lock: undefined | number;

export function getProcQueueSize() {
  let procQueue = new Array<QueuedEvent>().concat(queue);
  procQueue = procQueue.filter((e) => !e.processed);
  return procQueue.length;
}
export async function resolveQueue() {
  // if (timeout === undefined) return;
  if (_lock !== undefined && typeof _lock === 'number') {
    const diff = new Date().getTime() - _lock;
    if (diff < interval) {
      return false;
    }
  }
  _lock = new Date().getTime();
  /* timeout = undefined;
  clearTimeout(timeout); */
  queue = cleanQueue(queue);
  let procQueue = new Array<QueuedEvent>().concat(queue);
  procQueue = procQueue.filter((e) => !e.processed);
  const len = procQueue.length;
  if (len < 1) {
    _lock = undefined;
    return false;
  }
  let usedCpu = 0;
  if (typeof (pylon.getCpuTime) === 'function') {
    usedCpu = (await pylon.getCpuTime());
  }
  const neededCpuTime = Math.floor(cpuTimePerEvent * procQueue.length);
  const cpuT = usedCpu + neededCpuTime;
  try {
    if (cpuT >= 100) {
      try {
        console.log('queue using cpu burst ', neededCpuTime);
        await pylon.requestCpuBurst(async () => {
          await routing.ExecuteQueuedEvents(procQueue);
        }, Math.max(200, Math.floor(cpuT * 1.2)));
      } catch (err) {
        if (
          !(err instanceof pylon.CpuBurstRequestError)
          && typeof err.bucketRemainingMs !== 'number'
        ) {
          // console.error(e);

          const canFit = Math.min(
            procQueue.length - 1,
            Math.floor((100 - usedCpu) / cpuTimePerEvent) - 1,
          );
          if (canFit > 0) {
            const _alt = procQueue.slice(0, canFit);
            /* console.log(
              'queue alternative..',
              _alt,
              _alt.length + '/' + procQueue.length
            ); */
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
        console.log(e);
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
  } catch (e) {
    console.error(e);
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
      }
    }
    return true;
  });
  return q;
}

async function resetInterval() {
  // if (timeout instanceof timeout) return;
  // timeout = setTimeout(resolveQueue, Math.min(15000, interval));
  const _r = await resolveQueue();
  if (_r === false) {
    setTimeout(resolveQueue, Math.min(15000, interval));
  }
}
export async function checkObject(obj: QueuedEvent) {
  const _st = new Date();
  let run = true;
  // eslint-disable-next-line no-undef
  await sleep(Math.min(maxEventRuntime, interval) + 100);
  const _e = obj;
  let tries = 0;
  const mx = Math.min(maxEventRuntime, Math.ceil(interval * 6));
  while (run === true) {
    tries += 1;
    // eslint-disable-next-line no-undef
    // eslint-disable-next-line no-restricted-properties
    await sleep(Math.min(2000, Math.pow(2, tries)));
    const diff = new Date().getTime() - _st.getTime();
    if (diff >= mx) {
      run = false;
      return;
    }
    const _f = queue.findIndex((e) => e.id === _e.id);
    if (_f === -1 && !_e.processed && !_e.verified) {
      console.warn(`Event ${_e.id} gone! Re-adding...`, _lock, queue);
      /* await logDebug(
        'BOT_ERROR',
        new Map<string, any>([
          ['ERROR', `Event ${_e.id} (${_e.eventName}) gone! Re-adding...`]
        ])
      ); */
      queue.push(_e);
      // resetInterval();
      tries = 0;
    } else if (queue[_f].processed === true) {
      queue[_f].verified = true;
      _e.processed = true;
      _e.verified = true;
      return;
    }
  }
}
export async function addToQueue(eventName: string, ts: string, ...args: any) {
  // console.log('Adding to queue ', eventName);
  const obj = new QueuedEvent(eventName, ...args);
  obj.id = ts;
  queue.push(obj);
  await resetInterval();
  return obj;
}
