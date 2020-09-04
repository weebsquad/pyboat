/* eslint-disable import/no-mutable-exports */
import { deepCompare } from '../utils';

const kv = new pylon.KVNamespace('eventHandlerRatelimit');
const globals = true;
const eventPool = 'pool'; // Array
export let poolGlob = new Array<PoolEntry>();

const limits = {
  global: ['20/5000', '60/20000', '200/40000'], // Doesn't check per-event type
  event: ['9/6000', '15/15000', '40/30000'], // Checks per-event (global definition of per-event ratelimits)
  auditlog: ['10/4000', '30/40000', '100/120000'],
  auditlog_MESSAGE_DELETE: ['3/7500'],
};

class PoolEntry {
  'id': number;
  'event': string;
  'type': string;
}

export async function clean() {
  const now = new Date().getTime();
  let longestRl = 1;
  for (const keyScope in limits) {
    const objScope: Array<string> = limits[keyScope];
    objScope.map((ele) => {
      const time = +ele.split('/')[1];
      if (time > longestRl) {
        longestRl = time;
      }
    });
  }
  if (globals) {
    poolGlob = poolGlob.filter((ele) => {
      const diff = now - ele.id;
      if (diff < 0 || diff < longestRl) {
        return true;
      }
      return false;
    });
    return;
  }
  const pool = await getPool();
  const newP = pool.filter((ele) => {
    const diff = now - ele.id;
    if (diff < 0 || diff < longestRl) {
      return true;
    }
    return false;
  });
  if (!deepCompare(newP, pool)) {
    await savePool(newP);
  }
}

async function getPool() {
  if (globals) {
    return poolGlob;
  }
  const pool = await kv.get(eventPool);
  if (typeof pool !== 'string') {
    await savePool([]);
    return [];
  }
  const ret:Array<PoolEntry> = JSON.parse(pool);
  return ret;
}
async function savePool(data: any[]) {
  if (globals) {
    poolGlob = data;
    return poolGlob;
  }
  await kv.put(eventPool, JSON.stringify(data));
}

// for adding stuff to tracking ONLY
export async function eventTracker(
  eventName: string,
  type: string,
  time: any = Date.now(),
) {
  if (time instanceof Date) {
    time = time.getTime();
  }
  if (globals) {
    poolGlob.push({
      id: time,
      event: eventName,
      type,
    });
    return;
  }
  const pool = await getPool();
  pool.push({
    id: time,
    event: eventName,
    type,
  });
  await savePool(pool);
}

async function getTrackedEvents(eventName: string, time: any = Date.now()) {
  if (time instanceof Date) {
    time = time.getTime();
  }
  // await clean(); // Spring cleaning
  const pool = await getPool();
  const newP = pool.filter((ele) => {
    const diff = time - ele.id;
    if (ele.event === eventName) {
      return true;
    }
    return false;
  });
  return newP;
}

export async function isRatelimit(
  eventName: string,
  type: string,
  time: any = Date.now(),
) {
  type = type.toLowerCase();
  if (
    type !== 'auditlog'
    && type !== 'global'
    && type !== 'all'
    && type !== 'event'
  ) {
    type = type.toUpperCase();
  } // lmao shut up
  if (time instanceof Date) {
    time = time.getTime();
  }

  // await clean(); // Spring cleaning

  const tracks = await getPool();

  function runChecks() {
    let allowedKeys;
    if (type === 'all') {
      allowedKeys = [
        'global',
        'auditlog',
        'event',
        eventName,
        `auditlog_${eventName}`,
      ];
    }
    if (type === 'global') {
      allowedKeys = ['global'];
    }
    if (type === 'event') {
      allowedKeys = ['event', eventName];
    }
    if (type === 'auditlog') {
      allowedKeys = ['auditlog', `auditlog_${eventName}`];
    }
    if (typeof allowedKeys === 'undefined') {
      allowedKeys = [eventName];
    }

    for (const keyScope in limits) {
      if (allowedKeys.indexOf(keyScope) === -1) {
        continue;
      } // Check keys
      const objScope: Array<string> = limits[keyScope];
      const overLimit = objScope.find((ele) => {
        const timeMs = +ele.split('/')[1];
        const incidencesNeeded = +ele.split('/')[0];
        const timedChecks = tracks.filter((ele2) => {
          const diff = time - ele2.id;
          if (diff <= timeMs) {
            if (type === 'auditlog' && ele2.type !== 'auditlog') {
              return false;
            } // if our check is for auditlogs, we only care about audit-log-tracked events
            if (type === 'global' && ele2.type !== 'global') {
              return false;
            }
            if (keyScope === 'global' || keyScope === 'auditlog') {
              return true;
            } // if the scope we're looking at doesn't care about event types, let's not check them
            if (ele2.event === eventName) {
              return true;
            } // if the scope we're looking at is event-specific, let's return true if its the same event :D
          }
          return false;
        });

        if (timedChecks.length > incidencesNeeded) {
          return true;
        }
        return false;
      });
      if (typeof overLimit !== 'undefined') {
        return true;
      }
    }
    return false;
  }
  return runChecks();
}
