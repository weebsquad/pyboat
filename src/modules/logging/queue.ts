import * as utils from '../../lib/utils';
import * as main from './main';

let queue: {[key: string]: Array<discord.Message.OutgoingMessageOptions>} = {};

const interval = 2000;
let _lock: undefined | number;
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
  // if (timeout === undefined) return;
  if (checkLocks() !== true) {
    return false;
  }
  _lock = new Date().getTime();
  const _thisD = new Map<string, Array<discord.Message.OutgoingMessageOptions>>();
  for (const key in queue) {
    _thisD.set(key, queue[key]);
  }
  queue = {};
  const combined = main.combineMessages(_thisD);
  await main.sendInLogChannel(combined);
  _lock = new Date().getTime();

  return true;
}

async function resetInterval(retry = true) {
  const _r = checkLocks();
  if (_r === true) {
    setTimeout(resolveQueue, Math.ceil(interval / 2));
  } else if (retry === true) {
    setTimeout(() => {
      resetInterval(false);
    }, _r + 100);
  }
}

export function addToQueue(channelId: string, opts: Array<discord.Message.OutgoingMessageOptions>) {
  if (!Array.isArray(queue[channelId])) {
    queue[channelId] = [];
  }
  queue[channelId].push(...opts);
  resetInterval();
}
