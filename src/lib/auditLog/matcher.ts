/* eslint-disable no-loop-func */
/* eslint-disable array-callback-return */
/* eslint-disable no-unused-expressions */
import { auditLogDefinitions } from './dataCollector';
import { QueuedEvent } from '../eventHandler/queue';
import * as utils from '../utils';
import { config } from '../../config';

const kv = new pylon.KVNamespace('auditLogMatcher');
/* const entryPool = 'pool'; // Array */
const kvlogEntryTimeout = 11 * 60 * 1000;
const logEntryLimiter = 15 * 1000;
const waits: {[key: string]: number} = {
  // discord.AuditLogEntry.ActionType.MEMBER_BAN_ADD
  22: 400,
  // discord.AuditLogEntry.ActionType.MEMBER_BAN_REMOVE
  23: 400,
};
const logsPerSecond = 15; // used to determine how many entries to show
const groupingActions = [
  discord.AuditLogEntry.ActionType.MESSAGE_DELETE,
  discord.AuditLogEntry.ActionType.MESSAGE_BULK_DELETE,
  discord.AuditLogEntry.ActionType.MEMBER_MOVE,
  discord.AuditLogEntry.ActionType.MEMBER_DISCONNECT,
];
// similar values to accept
const artificialMatches = <any>{
  'null': [false, 0, ''],
  'false': [0, '', null],
  'true': [1],
  '': [null],
};

// remap for object property checks
const objectRemaps = <any>{
  1: {
    // GUILD_UPDATE
    iconHash: 'icon',
    rulesChannelId: null,
    publicUpdatesChannelId: null,
  },
  30: {
    // ROLE_CREATE
    permissionsNew: null,
  },
  31: {
    // ROLE_UPDATE
    permissionsNew: null,
  },
  32: {
    // ROLE_DELETE
    permissionsNew: null,
  },

};

// dont check objects with these values... lol
const disableAliases = [null, 0, '0', false];
const blacklistedTypingsCheck = ['function', 'undefined', 'object'];
/*
export async function clean() {
  let now = new Date().getTime();
  let pool = await getPool();
  let newP = pool.filter(function(ele) {
    let diff =
      now - new Date(utils.decomposeSnowflake(ele.id).timestamp).getTime();
    if (diff < 0 || diff < logEntryTimeout) return true;
    return false;
  });
  if (!utils.deepCompare(newP, pool)) await savePool(newP);
}
*/
/*
async function getPool() {
  let pool = await kv.get(entryPool);
  if (typeof pool !== 'string') {
    await savePool([]);
    return [];
  }
  return JSON.parse(pool) as Array<discord.AuditLogEntry>;
}
async function savePool(data: any[]) {
  return await kv.put(entryPool, JSON.stringify(data));
}
*/
async function getPoolEntry(id: string) {
  /* let pool = await getPool();
  let log = pool.find(function(ele) {
    return ele.id === id;
  }); */
  let log: unknown = await kv.get(id);
  if (typeof log === 'undefined' || log === null) {
    return false;
  }
  if (typeof log === 'string') {
    log = JSON.parse(log);
  }
  return log as discord.AuditLogEntry;
}

async function savePoolEntry(entry: discord.AuditLogEntry) {
  /* await clean();

  let pool = await getPool();
  let log = pool.findIndex(function(ele) {
    return ele.id === entry.id;
  }); */
  const log = await getPoolEntry(entry.id);
  if (log === false) {
    // very exceptional cases lol
    let _en;
    if (
      entry instanceof discord.AuditLogEntry.MessageDelete
      || entry instanceof discord.AuditLogEntry.MemberMove
      || entry instanceof discord.AuditLogEntry.MemberDisconnect
    ) {
      _en = JSON.parse(JSON.stringify(entry));
      _en.options.count = 1;
    }
    if (_en === undefined) {
      _en = entry;
    }
    await kv.put(entry.id, _en, { ttl: kvlogEntryTimeout });
    // pool.push(_en);
  } else {
    let _en;
    if (
      entry instanceof discord.AuditLogEntry.MessageDelete
      || entry instanceof discord.AuditLogEntry.MemberMove
      || entry instanceof discord.AuditLogEntry.MemberDisconnect
    ) {
      _en = JSON.parse(JSON.stringify(entry));
      _en.options.count += 1;
    }
    if (_en === undefined) {
      _en = entry;
    }
    await kv.put(entry.id, _en, { ttl: kvlogEntryTimeout });
    // pool[log] = _en;
  }
  // await savePool(pool);
}

export function getAuditLogErrorJson(message: string) {
  // lemayo
  return {
    error: true,
    message,
  };
}

export async function validateAuditEvent(
  eventName: string,
  data: any,
  auditLogEntry: discord.AuditLogEntry.AnyAction,
) {
  const def = auditLogDefinitions[eventName];
  if (
    def.validate instanceof Function
    && !(def.getCompareData instanceof Function)
  ) {
    if (typeof def.store === 'object') {
      const saved = await getPoolEntry(auditLogEntry.id);
      return def.validate(data, auditLogEntry, saved);
    }
    return def.validate(data, auditLogEntry);
  }
  if (typeof def[auditLogEntry.actionType] === 'function') {
    if (typeof def.store === 'object') {
      const saved = await getPoolEntry(auditLogEntry.id);
      return def[auditLogEntry.actionType](data, auditLogEntry, saved);
    }
    return def[auditLogEntry.actionType](data, auditLogEntry);
  }
  const parsedData = def.getCompareData(data);
  for (const key in def) {
    if (key !== 'targetId') {
      continue;
    } // lol
    if (!(def[key] instanceof Function)) {
      continue;
    }
    const objc = def[key](data);
    if (typeof objc === 'undefined') {
      return false;
    }
    if (auditLogEntry[key] !== objc) {
      return false;
    }
  }
  const valsCheck = ['newValue', 'oldValue'];
  for (const key in auditLogEntry.changes) {
    if (typeof auditLogEntry.changes[key] !== 'object') {
      continue;
    }

    for (let i = 0; i < valsCheck.length; i += 1) {
      const al = auditLogEntry.changes[key][valsCheck[i]];
      if (typeof al === 'undefined') {
        continue;
      }
      if (i > 0 && !Array.isArray(parsedData)) {
        continue;
      } // Incase parsedData is a single value, we only check new values, not old (cached)
      let cc = parsedData;
      if (Array.isArray(parsedData)) {
        cc = parsedData[i];
      }
      if ((i > 0 && typeof cc === 'undefined') || cc === null) {
        continue;
      } // Incase pylon doesn't give us cached stuff, lets not say it doesnt match because of it, lol
      let cck = cc[key];
      // check remaps
      const rm = objectRemaps[auditLogEntry.actionType];
      if (typeof rm === 'object') {
        if (typeof rm[key] === 'string') {
          cck = cc[rm[key]];
        } else if (rm[key] === null) {
          continue;
        }
      }

      if (typeof cck !== typeof al) {
        // check disabled
        if (
          disableAliases.indexOf(cck) > -1
          && disableAliases.indexOf(al) > -1
        ) {
          continue;
        }
        // check artificial
        if (
          typeof artificialMatches[al]
          !== 'undefined'
        ) {
          if (
            artificialMatches[al].indexOf(
              cc[key],
            ) > -1
          ) {
            // c onsole.log('validate', 'type-check', 'bypass by artificial match');
            continue;
          }
        }

        console.log(
          'auditlog.validate failed key type-check',
          key,
          cck,
          artificialMatches[cc[key]],
          auditLogEntry,
        );
        return false;
      }
      if (typeof cck === 'object' && cck !== null) {
        if (!utils.deepCompare(cck, al)) {
          if (key === 'permissionOverwrites' && Array.isArray(cck) && Array.isArray(al)) {
            const adiff1 = cck.filter((obj: discord.Channel.IPermissionOverwrite) => {
              const _f: discord.Channel.IPermissionOverwrite | undefined = al.find((obj2) => obj2.id === obj.id);
              if (!_f || _f === undefined) {
                return true;
              }
              if (_f.allow !== obj.allow || _f.deny !== obj.deny || _f.type !== obj.type) {
                return true;
              }
              return false;
            });
            const adiff2 = al.filter((obj: discord.Channel.IPermissionOverwrite) => {
              const _f: discord.Channel.IPermissionOverwrite | undefined = cck.find((obj2) => obj2.id === obj.id);
              if (!_f || _f === undefined) {
                return true;
              }
              if (_f.allow !== obj.allow || _f.deny !== obj.deny || _f.type !== obj.type) {
                return true;
              }
              return false;
            });
            if (adiff1.length === 0 && adiff2.length === 0) {
              return true;
            }
            return false;
          }
          console.log('validate', 'failed obj Compare', key, auditLogEntry);
          return false;
        }
      } else if (cck !== al) {
        console.log('validate', 'failed key Compare', key, auditLogEntry);
        return false;
      }
    }
  }
  return true;
}

export function isAuditLogEnabled(eventName: string) {
  if (typeof auditLogDefinitions[eventName] !== 'object') {
    return false;
  }
  /* if (typeof auditLogDefinitions[eventName]['guildId'] !== 'function')
    return false; */
  if (typeof auditLogDefinitions[eventName].auditLogEntries === 'undefined') {
    return false;
  }
  if (
    typeof auditLogDefinitions[eventName].getCompareData !== 'function'
    && typeof auditLogDefinitions[eventName].validate !== 'function'
  ) {
    for (const key in auditLogDefinitions[eventName].auditLogEntries) {
      const num = auditLogDefinitions[eventName].auditLogEntries[key];
      if (typeof auditLogDefinitions[eventName][num] !== 'function') {
        return false;
      }
    }
    return true;
  }
  return true;
}

// Raw/final function to get the data
export async function getAuditLogData(
  eventName: string,
  ts: number,
  eventPayload: any,
) {
  if (!isAuditLogEnabled(eventName)) {
    return getAuditLogErrorJson('Audit logs not setup for this event');
  }

  const def = auditLogDefinitions[eventName];
  if (typeof def.beforeFetch === 'function') {
    const checkShouldFetch = def.beforeFetch(eventPayload);
    if (typeof checkShouldFetch === 'boolean' && !checkShouldFetch) {
      return getAuditLogErrorJson(
        'beforeFetch stopped audit logs from being fetched',
      );
    }
  }
  // let guildId = auditLogDefinitions[eventName]['guildId'](eventPayload);
  const { guildId } = config;
  const guild = await discord.getGuild(guildId);
  if (typeof guild !== 'object' || guild === null) {
    return getAuditLogErrorJson('No guild found');
  }
  let limit = new Date(ts - logEntryLimiter).getTime(); // Limit on how long ago audit log entries can be
  const diffSince = new Date().getTime() - ts;
  const limitQuant = Math.max(8, Math.ceil(logsPerSecond * (diffSince / 1000)));
  const opts = { limit: limitQuant };
  let actionsForThis = def.auditLogEntries;
  if (!Array.isArray(actionsForThis)) {
    actionsForThis = [actionsForThis];
  }
  let maxWait = 0;
  let isGrouped = false;
  actionsForThis.forEach((e: number) => {
    if (groupingActions.includes(e)) {
      isGrouped = true;
    }
    if (typeof waits[e] === 'number' && waits[e] > maxWait) {
      maxWait = waits[e];
    }
  });
  if (isGrouped) {
    limit = new Date(new Date().getTime() - 10 * 60 * 1000).getTime();
  }

  // specific stuff
  const diffn = new Date().getTime() - ts;
  if (maxWait > 0 && diffn < maxWait) {
    await sleep(Math.max(50, maxWait - diffn));
  }

  let tmpstore;
  for await (const item of guild.iterAuditLogs(opts)) {
    // check too long ago
    const dateSn = new Date(
      utils.decomposeSnowflake(item.id).timestamp,
    ).getTime();
    if (dateSn < limit) {
      break;
    }
    if (actionsForThis.indexOf(item.actionType) === -1) {
      continue;
    }
    const res = await validateAuditEvent(eventName, eventPayload, item);
    if (!res) {
      continue;
    }

    if (typeof def.store === 'object') {
      if (typeof def.returnData === 'function') {
        tmpstore = await getPoolEntry(item.id);
      }
      if (def.store.entryFound === true) {
        await savePoolEntry(item);
      }
    }

    if (typeof def.returnData === 'function') {
      return def.returnData(item, tmpstore);
    }
    return item;
  }
  return getAuditLogErrorJson('No entry found');
}

export async function getMultiAuditLogData(q: Array<QueuedEvent>) {
  const tdiff = new Date();
  const guildEvents = new Map<string, Array<QueuedEvent>>();
  let hasGrouping = false;
  let maxWait = 0;
  let procQueue = new Array<QueuedEvent>().concat(q).map((e) => {
    if (!isAuditLogEnabled(e.eventName)) {
      e.auditLogEntry = getAuditLogErrorJson(
        'Audit logs not setup for this event',
      );
      return e;
    }
    const def = auditLogDefinitions[e.eventName];
    if (typeof def.beforeFetch === 'function') {
      const checkShouldFetch = def.beforeFetch(e.payload);
      if (typeof checkShouldFetch === 'boolean' && !checkShouldFetch) {
        e.auditLogEntry = getAuditLogErrorJson(
          'beforeFetch stopped audit logs from being fetched',
        );
      }
    }
    // let guildId = auditLogDefinitions[e.eventName]['guildId'](e.payload);
    const { guildId } = config;
    if (typeof guildId !== 'string') {
      return e;
    }
    e.guildId = guildId;
    let actionsForThis = def.auditLogEntries;
    if (!Array.isArray(actionsForThis)) {
      actionsForThis = [actionsForThis];
    }
    actionsForThis.forEach((e2: number) => {
      if (groupingActions.includes(e2)) {
        hasGrouping = true;
      }
      if (typeof waits[e2] === 'number' && waits[e2] > maxWait) {
        maxWait = waits[e2];
      }
    });

    if (!guildEvents.has(guildId)) {
      const newh = new Array<QueuedEvent>().concat([e]);
      guildEvents.set(guildId, newh);
    } else {
      const gh = guildEvents.get(guildId);
      if (Array.isArray(gh)) {
        gh.push(e);
        guildEvents.set(guildId, gh);
      }
    }
    return e;
  });

  const guilds = new Map<string, discord.Guild>();
  const donegids = new Array<string>();
  for (const [k, v] of guildEvents) {
    if (donegids.includes(k)) {
      continue;
    }
    let g;
    if (!guilds.has(k)) {
      g = await discord.getGuild(k);
    }
    if (guilds.has(k)) {
      g = guilds.get(k);
    }
    if (!(g instanceof discord.Guild)) {
      donegids.push(k);
      continue;
    }
    if (!guilds.has(k)) {
      guilds.set(k, g);
    }
  }

  const highestTime = new Map<string, string>();
  const lowestTime = new Map<string, number>();
  for (const [guildId, events] of guildEvents) {
    highestTime.set(
      guildId,
      utils.composeSnowflake(
        utils.decomposeSnowflake(events[events.length - 1].id).timestamp,
      ),
    );
    lowestTime.set(guildId, utils.decomposeSnowflake(events[0].id).timestamp);
  }

  for (const [guildId, guild] of guilds) {
    let _events = guildEvents.get(guildId);
    if (!Array.isArray(_events) || _events === undefined) {
      continue;
    } // i know this is dumb, but editor needs this check for correct typings :weary:
    const bf = highestTime.get(guildId);
    let lf = lowestTime.get(guildId);
    if (typeof bf !== 'string' || typeof lf !== 'number') {
      continue;
    }
    let lowerDiff = logEntryLimiter;
    if (hasGrouping) {
      lowerDiff = 10 * 60 * 1000;
    }
    lf = new Date(lf).getTime() - lowerDiff; // Limit on how long ago audit log entries can be
    const opts = {
      limit: Math.min(450, Math.floor(procQueue.length * 1.5)),
      before: bf,
    };
    const nd = new Date().getTime() - tdiff.getTime();
    if (maxWait > 0 && nd < maxWait) {
      await sleep(Math.max(50, maxWait - nd));
    }
    for await (const item of guild.iterAuditLogs(opts)) {
      const dateSn = new Date(
        utils.decomposeSnowflake(item.id).timestamp,
      ).getTime();
      if (dateSn < lf) {
        break;
      }
      // const _f = false;
      let tmpstore: any;
      _events = await Promise.all(
        _events.map(async (e) => {
          if (e.auditLogEntry !== null) {
            return e;
          }
          const def = auditLogDefinitions[e.eventName];
          let actionsForThis = def.auditLogEntries;
          if (!Array.isArray(actionsForThis)) {
            actionsForThis = [actionsForThis];
          }
          if (actionsForThis.indexOf(item.actionType) === -1) {
            return e;
          }
          const res = await validateAuditEvent(e.eventName, e.payload, item);
          if (!res) {
            return e;
          }
          if (typeof def.store === 'object') {
            if (typeof def.returnData === 'function') {
              tmpstore = await getPoolEntry(item.id);
            }
            if (def.store.entryFound === true) {
              await savePoolEntry(item);
            }
          }
          e.auditLogEntry = item;
          if (typeof def.returnData === 'function') {
            e.auditLogEntry = def.returnData(item, tmpstore);
          }
          return e;
        }),
      );
    }
    _events.forEach((e) => {
      const _i = procQueue.findIndex((e2) => {
        e.id === e2.id;
      });
      if (_i > -1) {
        procQueue[_i].auditLogEntry = e.auditLogEntry;
      }
    });
  }
  procQueue = procQueue.map((e) => {
    if (e.auditLogEntry === null) {
      if (typeof e.guildId !== 'string') {
        e.auditLogEntry = getAuditLogErrorJson('No guild found');
      } else {
        e.auditLogEntry = getAuditLogErrorJson('No entry found');
      }
    }
    return e;
  });
  // console.log('final!', procQueue);
  return procQueue;
}
