import * as conf from '../../config';
import {
  eventFunctions,
  eventFunctionPrefixAuditLog,
  eventFunctionQueue,
  eventFunctionVarForceIndividuals,
  eventFunctionEveryEvent,
} from '../../constants/constants';
import { moduleDefinitions, asyncModules } from '../../modules/_init_';
import { EventOverrides } from './overrides';
import {
  getAuditLogData,
  isAuditLogEnabled,
  getAuditLogErrorJson,
  getMultiAuditLogData,
} from '../auditLog/matcher';
import { isFiltered } from './filter';
import * as ratelimit from './ratelimit';
import {
  addToQueue,
  QueuedEvent,
  checkObject,
  getProcQueueSize,
  resolveQueue,
} from './queue';
import * as utils from '../utils';
import { logDebug } from '../../modules/logging/events/custom';
import { InitializeCommands2 } from '../commands2';

const { config } = conf;

let rl = false;
async function _Initialize() {
  if (rl === true) {
    return;
  }
  rl = true;
  // InitializeCommands2();
  await logDebug('BOT_STARTED');
}

export async function OnEvent(event: string, ts: string, ...args: any[]) {
  try {
    if (!rl) {
      await _Initialize();
    }

    const tdiff = new Date(utils.decomposeSnowflake(ts).timestamp).getTime();
    console.log(`${event}.start`);
    if (!EventHasExecution(event)) {
      return;
    }
    console.log(`${event}.hasexec`);
    if (EventHasOverride(event)) {
      args = EventOverrides[event](...args);
    }
    if (!Array.isArray(args)) {
      args = [args];
    }

    const isF = isFiltered(event, 'global', ...args);
    if (isF === true) {
      return;
    } // if our edge-case filtering triggers for this payload, let's not do anything
    console.log(`${event}.isfiltered`);
    let isQ = isQueueEnabled();

    const tm = new Date(utils.decomposeSnowflake(ts).timestamp).getTime();
    await ratelimit.eventTracker(event, 'global', tm); // add this event to our ratelimit tracking since it seems like it'll run

    let isAlRl = false;
    const isRl = (await ratelimit.isRatelimit(event, 'global', tm))
      || (await ratelimit.isRatelimit(event, 'event', tm)); // Immediately check if it's ratelimited afterwards (OR global/event)

    if (
      EventHasAuditLog(event)
      && isAuditLogEnabled(event)
      && !isFiltered(event, 'auditlog', ...args)
    ) {
      await ratelimit.eventTracker(event, 'auditlog', tm); // might as well add it now, it will probs run
      isAlRl = await ratelimit.isRatelimit(event, 'auditlog', tm);
    }
    isQ = isQ && (isRl || isAlRl); // only use queue if we hit a internal ratelimit..
    // isQ = true; // debug
    const runQ = getProcQueueSize() > 0;
    const readableq = isQ === true ? 'True' : 'False';
    if (!isQ && runQ) {
      await resolveQueue();
    }

    // isQ = true; // debugging
    if (isQ) {
      const qObj = await addToQueue(event, ts, ...args);
      await checkObject(qObj);
      return;
    }
    await ExecuteModules(event, ts, null, ...args);
  } catch (e) {
    const err: Error = e;
    if (conf.guildId === conf.globalConfig.masterGuild) {
      console.error(e);
    }
    await logDebug(
      'BOT_ERROR',
      new Map<string, any>([
        ['ERROR', `Error at event ${event}\n${err.stack}`],
      ]),
      ts,
    );
    /*
      let ch = await discord.getGuildTextChannel(config.modules.errorsChannel);
      if (ch !== null) {
        let cc = new utils.FakeConsole(ch);
        cc.log('Error at event ' + event + '\n' + err.stack);
      } */
  }
}
export async function getEventAuditLogData(
  event: string,
  tm: number,
  ...args: any[]
) {
  const tdiff = new Date().getTime();
  let auditLogData;
  if (!isAuditLogEnabled(event)) {
    return getAuditLogErrorJson(
      'Audit log pulling not configured for this event.',
    );
  }
  if (!(await ratelimit.isRatelimit(event, 'auditlog', tm))) {
    if (!isFiltered(event, 'auditlog', ...args)) {
      try {
        auditLogData = await getAuditLogData(event, tm, args);
      } catch (e) {
        console.error(e);
        auditLogData = getAuditLogErrorJson(
          'Routing errored whilst pulling audit logs',
        );
      }

      if (typeof auditLogData[0] === 'object') {
        if (auditLogData[0] instanceof discord.AuditLogEntry) {
          // here, we're sure that this has correct auditlog info
          // await ratelimit.eventTracker(event, 'auditlog', tm);
        }
      }
    } else {
      auditLogData = getAuditLogErrorJson('Data forcefully filtered out.'); // lmao
    }
  } else {
    auditLogData = getAuditLogErrorJson('Data not fetched due to ratelimit');
  }

  if (Array.isArray(auditLogData)) {
    auditLogData = auditLogData.concat(args);
  }
  return auditLogData;
}

export async function getMultiEventAuditLogData(evs: Array<QueuedEvent>) {
  const tdiff = new Date().getTime();
  let events = [].concat(evs); // making a solid copy just in case
  let auditLogData;
  events = events.map((e) => {
    if (isFiltered(e.eventName, 'auditlog', ...e.payload)) {
      e.auditLogEntry = getAuditLogErrorJson('Data forcefully filtered out.');
      return e;
    }
    if (!isAuditLogEnabled(e.eventName)) {
      e.auditLogEntry = getAuditLogErrorJson(
        'Audit log pulling not configured for this event.',
      );
      return e;
    }
    if (!EventHasAuditLog(e.eventName)) {
      e.auditLogEntry = getAuditLogErrorJson(
        'Audit log callback functions not defined for this event.',
      );
      return e;
    }
    return e;
  });

  const alEvents = events.filter((e: QueuedEvent) => {
    const isFilter = isFiltered(e.eventName, 'auditlog', ...e.payload);
    const isAuditLog = isAuditLogEnabled(e.eventName);
    const auditLogEnabled = EventHasAuditLog(e.eventName);
    const and = !isFilter && isAuditLog && auditLogEnabled && e.auditLogEntry === null;
    return and;
  });
  const len = alEvents.length;
  let testLogs = new Array<QueuedEvent>();
  if (alEvents.length > 0) {
    if (len >= 400) {
      // audit log matcher can't handle more than this, so let's do them in splits instead
      const splits = Math.ceil(len / 300); // some leverage
      const chunks = utils.chunkify(alEvents, splits, true);
      for (let i = 0; i < chunks.length; i += 1) {
        const e = chunks[i];
        testLogs = [...testLogs, ...(await getMultiAuditLogData(e))];
      }
    } else {
      testLogs = await getMultiAuditLogData(alEvents);
    }
    testLogs.forEach((e) => {
      const _i = events.findIndex((e2) => {
        e.id === e2.id;
      });
      if (_i > -1) {
        events[_i].auditLogEntry = e.auditLogEntry;
        events[_i].guildId = e.guildId;
      }
    });
  }
  return events;
}

export async function ExecuteModules(
  event: string,
  ts: string,
  moduleTarget: string | null,
  ...args: any[]
) {
  const tm = new Date(utils.decomposeSnowflake(ts).timestamp).getTime();
  const id = ts;
  const eventFuncName = eventFunctions[event];

  let auditLogData;
  if (EventHasAuditLog(event)) {
    auditLogData = await getEventAuditLogData(event, tm, ...args);
  }

  const { guildId } = conf;

  for (const moduleName in moduleDefinitions) {
    const tdiff = new Date().getTime();
    const module = moduleDefinitions[moduleName];
    if (typeof module !== 'object' || module === null) {
      continue;
    }
    let _err: any;
    try {
      if (!isModuleEnabled(moduleName)) {
        continue;
      }
      if (moduleTarget !== null && moduleName !== moduleTarget) {
        continue;
      }
      const eventFunction = module[eventFuncName];
      const eventAny = module[eventFunctionEveryEvent];
      if (eventAny instanceof Function) {
        if (asyncModules.includes(moduleName)) {
          eventAny(event, id, guildId, ...args);
        } else {
          const returnVal = await eventAny(event, id, guildId, ...args);
          if (typeof returnVal === 'boolean' && returnVal === false) {
            return;
          }
        }
      }
      if (eventFunction instanceof Function) {
        if (asyncModules.includes(moduleName)) {
          eventFunction(id, guildId, ...args);
        } else {
          const returnVal = await eventFunction(id, guildId, ...args);
          if (typeof returnVal === 'boolean' && returnVal === false) {
            return;
          }
        }
      }

      if (typeof auditLogData !== 'undefined') {
      // Now run audit log stuff
        const eventAuditLogFunction = module[eventFunctionPrefixAuditLog + eventFuncName];
        if (eventAuditLogFunction instanceof Function) {
          if (eventFunction instanceof Function) {
            console.warn(
              'WARNING: Dual AuditLog/Normal variants of the same event just ran in the same module!',
            );
          }
          if (!Array.isArray(auditLogData)) {
            auditLogData = [auditLogData, ...args];
          }
          if (asyncModules.includes(moduleName)) {
            eventAuditLogFunction(id, guildId, ...auditLogData);
          } else {
            const returnVal = await eventAuditLogFunction(
              id,
              guildId,
              ...auditLogData,
            );
            if (typeof returnVal === 'boolean' && returnVal === false) {
              return;
            }
          }
        }
      }
    } catch (e) {
      _err = `${event}.ExecuteModules.${moduleName}.${eventFuncName}\n${e.stack}`;
    }
    if (_err !== undefined) {
      throw new Error(_err);
    }
  }
}

export async function ExecuteQueuedEvents(q: Array<QueuedEvent>) {
  const { guildId } = conf;
  await logDebug(
    'RAW_EVENT',
    new Map<string, any>([
      ['EVENT', 'QUEUE_RUN'],
      ['TIMESTAMP', new Date().toISOString()],
      ['QUEUE', 'N/A'],
    ]),
  );
  let queue = new Array<QueuedEvent>().concat(q);
  // sort
  queue = queue.sort((a: QueuedEvent, b: QueuedEvent) => {
    const tsa = utils.decomposeSnowflake(a.id).timestamp;
    const tsb = utils.decomposeSnowflake(b.id).timestamp;
    return tsa - tsb;
  });
  let procQueue = new Array<QueuedEvent>().concat(queue);
  procQueue = await Promise.all(
    procQueue
      .filter((e) => !e.verified)
      .filter((e) => !e.processed),
  );
  if (isAlQueueEnabled()) {
    procQueue = await getMultiEventAuditLogData(procQueue);
  }

  const modulesSendIndividual = [];
  for (const moduleName in moduleDefinitions) {
    const module = moduleDefinitions[moduleName];
    if (typeof module !== 'object' || module === null) {
      continue;
    }
    if (!isModuleEnabled(moduleName)) {
      continue;
    }
    const forceInd = module[eventFunctionVarForceIndividuals];
    const eventFunction = module[eventFunctionQueue];
    const eventAuditLogFunction = module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    /* eslint-disable-next-line vars-on-top */
    /* eslint-disable-next-line no-var */
    let existsOne = eventFunction instanceof Function;
    if (!existsOne) {
      existsOne = isAlQueueEnabled() && eventAuditLogFunction instanceof Function;
    }
    if ((typeof forceInd === 'boolean' && forceInd === true) || !existsOne) {
      modulesSendIndividual.push(moduleName);
    }
  }
  function pQueue(p: Array<QueuedEvent>, q2: Array<QueuedEvent>) {
    q2 = q2.map((e: QueuedEvent) => {
      e.guildId = guildId;
      const proc = p.find((p2) => p2.id === e.id);
      if (proc) {
        e.processed = proc.processed;
      }
      return e;
    });
    const unProc = q2.filter((e) => !e.processed);
    return q2;
  }
  procQueue = procQueue.map((e: QueuedEvent) => {
    e.guildId = guildId;
    e.processed = true;
    return e;
  });
  queue = pQueue(procQueue, queue);
  for (const moduleName in moduleDefinitions) {
    const module = moduleDefinitions[moduleName];
    if (typeof module !== 'object' || module === null) {
      continue;
    }
    if (!isModuleEnabled(moduleName)) {
      continue;
    }
    const eventFunction = module[eventFunctionQueue];
    const eventAuditLogFunction = module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (modulesSendIndividual.indexOf(moduleName) > -1) {
      // todo: send individual events to every eventfunc in this module based on stuff in the queue!

      const test = await Promise.all(
        procQueue.map(async (e: QueuedEvent) => {
          const eventFunctionName = eventFunctions[e.eventName];
          const eventFunctionInd = module[eventFunctionName];
          const eventFunctionAuditLog = module[eventFunctionPrefixAuditLog + eventFunctionName];
          if (eventFunctionInd instanceof Function) {
            let _e;
            try {
              if (asyncModules.includes(moduleName)) {
                eventFunctionInd(e.id, guildId, ...e.payload);
              } else {
                const returnVal = await eventFunctionInd(
                  e.id,
                  guildId,
                  ...e.payload,
                );
                if (typeof returnVal === 'boolean' && returnVal === false) {
                  return;
                }
              }
            } catch (e2) {
              _e = new Error(
                `${e.eventName
                }.ExecuteQueuedModules.${
                  moduleName
                }.${
                  eventFunctionName
                }\n${
                  e2.stack}`,
              );
            }
            if (_e !== undefined) {
              throw _e;
            }
          }
          if (eventFunctionAuditLog instanceof Function) {
            let _e;
            try {
              if (asyncModules.includes(moduleName)) {
                eventFunctionAuditLog(
                  e.id,
                  guildId,
                  e.auditLogEntry,
                  ...e.payload,
                );
              } else {
                const returnVal = await eventFunctionAuditLog(
                  e.id,
                  guildId,
                  e.auditLogEntry,
                  ...e.payload,
                );
                if (typeof returnVal === 'boolean' && returnVal === false) {
                  return;
                }
              }
            } catch (e2) {
              _e = new Error(
                `${e.eventName
                }.ExecuteQueuedModules.${
                  moduleName
                }.${
                  eventFunctionPrefixAuditLog
                }${eventFunctionName
                }\n${
                  e2.stack}`,
              );
            }
            if (_e !== undefined) {
              throw _e;
            }
          }
          return e;
        }),
      );
      continue;
    }
    let _e;
    try {
      if (eventFunction instanceof Function) {
        const returnVal = await eventFunction(procQueue);
        if (typeof returnVal === 'boolean' && returnVal === false) {
          return queue;
        }
      }
    } catch (e2) {
      _e = new Error(
        `ExecuteQueuedModules.${
          moduleName
        }.${
          eventFunctionQueue
        }\n${
          e2.stack}`,
      );
    }
    if (_e !== undefined) {
      throw _e;
    }
    try {
      if (isAlQueueEnabled() && eventAuditLogFunction instanceof Function) {
        // Now run audit log stuff
        if (eventFunction instanceof Function) {
          console.warn(
            'WARNING: Dual AuditLog/Normal variants of batched events just ran in the same module!',
          );
        }
        const returnVal = await eventAuditLogFunction(procQueue);
        if (typeof returnVal === 'boolean' && returnVal === false) {
          return queue;
        }
      }
    } catch (e2) {
      _e = new Error(
        `ExecuteQueuedModules.${
          moduleName
        }.${
          eventFunctionPrefixAuditLog
        }${eventFunctionQueue
        }\n${
          e2.stack}`,
      );
    }
    if (_e !== undefined) {
      throw _e;
    }
  }
  return queue;
}

export function isModuleEnabled(modName: string) {
  if (typeof modName !== 'string' || modName === null) {
    return false;
  }
  const cfgMod = config.modules[modName];
  if (typeof cfgMod !== 'object') {
    return false;
  }
  if (typeof cfgMod.enabled === 'boolean') {
    return cfgMod.enabled;
  }
  if (typeof cfgMod.toggles === 'object' && typeof cfgMod.toggles.enabled === 'boolean') {
    return cfgMod.toggles.enabled;
  }
  return false;
}

export function EventHasExecution(event: string) {
  const eventFuncName = eventFunctions[event];
  for (const moduleName in moduleDefinitions) {
    const module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') {
      continue;
    }
    if (!isModuleEnabled(moduleName)) {
      continue;
    }
    const eventFunction = module[eventFuncName];
    const eventAuditLogFunction = module[eventFunctionPrefixAuditLog + eventFuncName];
    const eventQueueFunction = module[eventFunctionQueue];
    const eventQueueAlFunction = module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (
      !(eventFunction instanceof Function)
      && !(eventAuditLogFunction instanceof Function)
      && !(eventQueueFunction instanceof Function)
      && !(eventQueueAlFunction instanceof Function)
    ) {
      continue;
    }
    return true;
  }
  return false;
}

export function EventHasOverride(event: string) {
  const bypass = EventOverrides[event];
  if (!(bypass instanceof Function)) {
    return false;
  }
  return true;
}

export function EventHasAuditLog(event: string) {
  const eventFuncName = eventFunctions[event];
  for (const moduleName in moduleDefinitions) {
    const module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') {
      continue;
    }
    if (!isModuleEnabled(moduleName)) {
      continue;
    }
    const eventAuditLogFunction = module[eventFunctionPrefixAuditLog + eventFuncName];
    const eventQueueFunction = module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (
      !(eventAuditLogFunction instanceof Function)
      && !(eventQueueFunction instanceof Function)
    ) {
      continue;
    }
    return true;
  }
  return false;
}

export function isQueueEnabled() {
  if (!config.modules.queue) {
    return false;
  }
  for (const moduleName in moduleDefinitions) {
    const module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') {
      continue;
    }
    if (!isModuleEnabled(moduleName)) {
      continue;
    }
    const eventFunction = module[eventFunctionQueue];
    const eventAuditLogFunction = module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (
      !(eventFunction instanceof Function)
      && !(eventAuditLogFunction instanceof Function)
    ) {
      continue;
    }
    return true;
  }
  return false;
}

export function isAlQueueEnabled() {
  if (!config.modules.queue) {
    return false;
  }
  for (const moduleName in moduleDefinitions) {
    const module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') {
      continue;
    }
    if (!isModuleEnabled(moduleName)) {
      continue;
    }
    const eventAuditLogFunction = module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (!(eventAuditLogFunction instanceof Function)) {
      continue;
    }
    return true;
  }
  return false;
}
