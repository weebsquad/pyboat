import { config } from '../../config';
import {
  eventFunctions,
  eventFunctionPrefixAuditLog,
  eventFunctionQueue,
  eventFunctionVarForceIndividuals,
  eventFunctionEveryEvent
} from '../../constants/constants';
import { moduleDefinitions, asyncModules } from '../../modules/_init_';
import { EventOverrides } from './overrides';
import {
  getAuditLogData,
  isAuditLogEnabled,
  getAuditLogErrorJson,
  getMultiAuditLogData
} from '../auditLog/matcher';
import { isFiltered } from './filter';
import * as ratelimit from './ratelimit';
import {
  addToQueue,
  QueuedEvent,
  checkObject,
  getProcQueueSize,
  resolveQueue
} from './queue';
import * as utils from '../utils';
import { logDebug } from '../../modules/logging/events/custom';
import { _Initialize, rl } from '../../main';

export function isModuleEnabled(modName: string) {
  if (typeof modName !== 'string' || modName === null) return;
  let cfgMod = config['modules'][modName];
  if (typeof cfgMod !== 'object') return true;
  if (typeof cfgMod['enabled'] === 'boolean') return cfgMod['enabled'];
  if (typeof cfgMod['toggles'] !== 'object') return true;
  if (typeof cfgMod['toggles']['enabled'] === 'boolean')
    return cfgMod['toggles']['enabled'];
  return true;
}

export async function OnEvent(event: string, ts: string, ...args: any[]) {
  try {
    if (!rl) await _Initialize();

    let tdiff = new Date(utils.decomposeSnowflake(ts).timestamp).getTime();
    if (!EventHasExecution(event)) return;

    if (EventHasOverride(event)) args = EventOverrides[event](...args);
    if (!Array.isArray(args)) args = [args];

    let isF = isFiltered(event, 'global', ...args);
    if (isF === true) return; // if our edge-case filtering triggers for this payload, let's not do anything

    let isQ = isQueueEnabled();

    let tm = new Date(utils.decomposeSnowflake(ts).timestamp).getTime();
    await ratelimit.eventTracker(event, 'global', tm); // add this event to our ratelimit tracking since it seems like it'll run

    let isAlRl = false;
    let isRl =
      (await ratelimit.isRatelimit(event, 'global', tm)) ||
      (await ratelimit.isRatelimit(event, 'event', tm)); // Immediately check if it's ratelimited afterwards (OR global/event)

    if (
      EventHasAuditLog(event) &&
      isAuditLogEnabled(event) &&
      !isFiltered(event, 'auditlog', ...args)
    ) {
      await ratelimit.eventTracker(event, 'auditlog', tm); // might as well add it now, it will probs run
      isAlRl = await ratelimit.isRatelimit(event, 'auditlog', tm);
    }
    isQ = isQ && (isRl || isAlRl); // only use queue if we hit a internal ratelimit..
    //isQ = true; // debug
    const runQ = getProcQueueSize() > 0;
    const readableq = isQ === true ? 'True' : 'False';
    if (!isQ && runQ) await resolveQueue();

    //isQ = true; // debugging
    if (isQ) {
      let qObj = await addToQueue(event, ts, ...args);
      await checkObject(qObj);
      return;
    } else {
      await ExecuteModules(event, ts, null, ...args);
    }
  } catch (e) {
    console.error(e);
    let err = e as Error;
    await logDebug(
      'BOT_ERROR',
      new Map<string, any>([
        ['ERROR', 'Error at event ' + event + '\n' + err.stack]
      ])
    );
    /*
      let ch = await discord.getGuildTextChannel(config.modules.errorsChannel);
      if (ch !== null) {
        let cc = new utils.FakeConsole(ch);
        cc.log('Error at event ' + event + '\n' + err.stack);
      }*/
  }
}
export async function getEventAuditLogData(
  event: string,
  tm: number,
  ...args: any[]
) {
  let tdiff = new Date().getTime();
  let auditLogData;
  if (!isAuditLogEnabled(event))
    return getAuditLogErrorJson(
      'Audit log pulling not configured for this event.'
    );
  if (!(await ratelimit.isRatelimit(event, 'auditlog', tm))) {
    if (!isFiltered(event, 'auditlog', ...args)) {
      try {
        auditLogData = await getAuditLogData(event, tm, args);
      } catch (e) {
        console.error(e);
        auditLogData = getAuditLogErrorJson(
          'Routing errored whilst pulling audit logs'
        );
      }

      if (typeof auditLogData[0] === 'object') {
        if (auditLogData[0] instanceof discord.AuditLogEntry) {
          // here, we're sure that this has correct auditlog info
          //await ratelimit.eventTracker(event, 'auditlog', tm);
        }
      }
    } else {
      auditLogData = getAuditLogErrorJson('Data forcefully filtered out.'); // lmao
    }
  } else {
    auditLogData = getAuditLogErrorJson('Data not fetched due to ratelimit');
  }

  if (Array.isArray(auditLogData)) auditLogData = auditLogData.concat(args);
  return auditLogData;
}

export async function getMultiEventAuditLogData(evs: Array<QueuedEvent>) {
  let tdiff = new Date().getTime();
  let events = new Array().concat(evs); // making a solid copy just in case
  let auditLogData;
  events = events.map(function(e) {
    if (isFiltered(e.eventName, 'auditlog', ...e.payload)) {
      e.auditLogEntry = getAuditLogErrorJson('Data forcefully filtered out.');
      return e;
    }
    if (!isAuditLogEnabled(e.eventName)) {
      e.auditLogEntry = getAuditLogErrorJson(
        'Audit log pulling not configured for this event.'
      );
      return e;
    }
    if (!EventHasAuditLog(e.eventName)) {
      e.auditLogEntry = getAuditLogErrorJson(
        'Audit log callback functions not defined for this event.'
      );
      return e;
    }
    return e;
  });

  let alEvents = events.filter(function(e: QueuedEvent) {
    let isFilter = isFiltered(e.eventName, 'auditlog', ...e.payload);
    let isAuditLog = isAuditLogEnabled(e.eventName);
    let auditLogEnabled = EventHasAuditLog(e.eventName);
    let and =
      !isFilter && isAuditLog && auditLogEnabled && e.auditLogEntry === null;
    return and;
  });
  let len = alEvents.length;
  let testLogs = new Array<QueuedEvent>();
  if (alEvents.length > 0) {
    if (len >= 400) {
      // audit log matcher can't handle more than this, so let's do them in splits instead
      let splits = Math.ceil(len / 300); // some leverage
      let chunks = utils.chunkify(alEvents, splits, true);
      for (var i = 0; i < chunks.length; i++) {
        let e = chunks[i];
        testLogs = [...testLogs, ...(await getMultiAuditLogData(e))];
      }
    } else {
      testLogs = await getMultiAuditLogData(alEvents);
    }
    testLogs.forEach(function(e) {
      let _i = events.findIndex((e2) => {
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
  let tm = new Date(utils.decomposeSnowflake(ts).timestamp).getTime();
  let id = ts;
  let eventFuncName = eventFunctions[event];

  let auditLogData;
  if (EventHasAuditLog(event))
    auditLogData = await getEventAuditLogData(event, tm, ...args);

  let guildId = discord.getGuildId();
  for (var moduleName in moduleDefinitions) {
    let tdiff = new Date().getTime();
    let module = moduleDefinitions[moduleName];
    if (typeof module !== 'object' || module === null) continue;
    if (!isModuleEnabled(moduleName)) continue;
    if (moduleTarget !== null && moduleName !== moduleTarget) continue;
    let eventFunction = module[eventFuncName];
    let eventAny = module[eventFunctionEveryEvent];
    if (eventAny instanceof Function) {
      let _e;
      try {
        if (asyncModules.includes(moduleName)) {
          eventAny(event, id, guildId, ...args);
        } else {
          let returnVal = await eventAny(event, id, guildId, ...args);
          if (typeof returnVal === 'boolean' && returnVal === false) return;
        }
      } catch (e) {
        _e = new Error(
          event +
            '.ExecuteModules.' +
            moduleName +
            '.' +
            eventFuncName +
            '\n' +
            e.stack
        );
      }
      if (_e !== undefined) throw _e;
    }
    if (eventFunction instanceof Function) {
      let _e;
      try {
        if (asyncModules.includes(moduleName)) {
          eventFunction(id, guildId, ...args);
        } else {
          let returnVal = await eventFunction(id, guildId, ...args);
          if (typeof returnVal === 'boolean' && returnVal === false) return;
        }
      } catch (e) {
        _e = new Error(
          event +
            '.ExecuteModules.' +
            moduleName +
            '.' +
            eventFuncName +
            '\n' +
            e.stack
        );
      }
      if (_e !== undefined) throw _e;
    }

    if (typeof auditLogData !== 'undefined') {
      // Now run audit log stuff
      let eventAuditLogFunction =
        module[eventFunctionPrefixAuditLog + eventFuncName];
      if (eventAuditLogFunction instanceof Function) {
        if (eventFunction instanceof Function)
          console.warn(
            'WARNING: Dual AuditLog/Normal variants of the same event just ran in the same module!'
          );
        if (!Array.isArray(auditLogData))
          auditLogData = [auditLogData, ...args];
        //console.log(auditLogData);
        let _e;
        try {
          if (asyncModules.includes(moduleName)) {
            eventAuditLogFunction(id, guildId, ...auditLogData);
          } else {
            let returnVal = await eventAuditLogFunction(
              id,
              guildId,
              ...auditLogData
            );
            if (typeof returnVal === 'boolean' && returnVal === false) return;
          }
        } catch (e) {
          _e = new Error(
            event +
              '.ExecuteModules.' +
              moduleName +
              '.' +
              eventFunctionPrefixAuditLog +
              eventFuncName +
              '\n' +
              e.stack
          );
        }
        if (_e !== undefined) throw _e;
      }
    }
  }
}

export async function ExecuteQueuedEvents(q: Array<QueuedEvent>) {
  await logDebug(
    'RAW_EVENT',
    new Map<string, any>([
      ['EVENT', 'QUEUE_RUN'],
      ['TIMESTAMP', new Date().toISOString()],
      ['QUEUE', 'N/A']
    ])
  );
  let queue = new Array<QueuedEvent>().concat(q);
  // sort
  queue = queue.sort(function(a: QueuedEvent, b: QueuedEvent) {
    let tsa = utils.decomposeSnowflake(a.id).timestamp;
    let tsb = utils.decomposeSnowflake(b.id).timestamp;
    return tsa - tsb;
  });
  let procQueue = new Array<QueuedEvent>().concat(queue);
  procQueue = await Promise.all(
    procQueue
      .filter(function(e) {
        return !e.verified;
      })
      .filter(function(e) {
        return !e.processed;
      })
  );
  if (isAlQueueEnabled())
    procQueue = await getMultiEventAuditLogData(procQueue);

  let modulesSendIndividual = new Array();
  for (var moduleName in moduleDefinitions) {
    let module = moduleDefinitions[moduleName];
    if (typeof module !== 'object' || module === null) continue;
    if (!isModuleEnabled(moduleName)) continue;
    let forceInd = module[eventFunctionVarForceIndividuals];
    let eventFunction = module[eventFunctionQueue];
    let eventAuditLogFunction =
      module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    let existsOne = eventFunction instanceof Function;
    if (!existsOne)
      existsOne =
        isAlQueueEnabled() && eventAuditLogFunction instanceof Function;
    if ((typeof forceInd === 'boolean' && forceInd === true) || !existsOne)
      modulesSendIndividual.push(moduleName);
  }
  function pQueue(p: Array<QueuedEvent>, q: Array<QueuedEvent>) {
    q = q.map(function(e: QueuedEvent) {
      let guildId = discord.getGuildId();
      e.guildId = guildId;
      let proc = p.find((p2) => {
        return p2.id === e.id;
      });
      if (proc) e.processed = proc.processed;
      return e;
    });
    let unProc = q.filter(function(e) {
      return !e.processed;
    });
    if (unProc.length > 0)
      console.log('error in routing, unprocessed batches: ', unProc);
    return q;
  }
  procQueue = procQueue.map(function(e: QueuedEvent) {
    e.processed = true;
    return e;
  });
  queue = pQueue(procQueue, queue);
  for (var moduleName in moduleDefinitions) {
    let module = moduleDefinitions[moduleName];
    if (typeof module !== 'object' || module === null) continue;
    if (!isModuleEnabled(moduleName)) continue;
    let eventFunction = module[eventFunctionQueue];
    let eventAuditLogFunction =
      module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (modulesSendIndividual.indexOf(moduleName) > -1) {
      // todo: send individual events to every eventfunc in this module based on stuff in the queue!

      let test = await Promise.all(
        procQueue.map(async function(e: QueuedEvent) {
          let eventFunctionName = eventFunctions[e.eventName];
          let eventFunction = module[eventFunctionName];
          let eventFunctionAuditLog =
            module[eventFunctionPrefixAuditLog + eventFunctionName];
          let guildId = discord.getGuildId();
          if (eventFunction instanceof Function) {
            let _e;
            try {
              if (asyncModules.includes(moduleName)) {
                eventFunction(e.id, guildId, ...e.payload);
              } else {
                let returnVal = await eventFunction(
                  e.id,
                  guildId,
                  ...e.payload
                );
                if (typeof returnVal === 'boolean' && returnVal === false)
                  return;
              }
            } catch (e2) {
              _e = new Error(
                e.eventName +
                  '.ExecuteQueuedModules.' +
                  moduleName +
                  '.' +
                  eventFunctionName +
                  '\n' +
                  e2.stack
              );
            }
            if (_e !== undefined) throw _e;
          }
          if (eventFunctionAuditLog instanceof Function) {
            let _e;
            try {
              if (asyncModules.includes(moduleName)) {
                eventFunctionAuditLog(
                  e.id,
                  guildId,
                  e.auditLogEntry,
                  ...e.payload
                );
              } else {
                let returnVal = await eventFunctionAuditLog(
                  e.id,
                  guildId,
                  e.auditLogEntry,
                  ...e.payload
                );
                if (typeof returnVal === 'boolean' && returnVal === false)
                  return;
              }
            } catch (e2) {
              _e = new Error(
                e.eventName +
                  '.ExecuteQueuedModules.' +
                  moduleName +
                  '.' +
                  eventFunctionPrefixAuditLog +
                  eventFunctionName +
                  '\n' +
                  e2.stack
              );
            }
            if (_e !== undefined) throw _e;
          }
          return e;
        })
      );
      continue;
    }
    //console.log(`${event} : ${moduleName}`);
    let _e;
    try {
      if (eventFunction instanceof Function) {
        let returnVal = await eventFunction(procQueue);
        if (typeof returnVal === 'boolean' && returnVal === false) return queue;
      }
    } catch (e2) {
      _e = new Error(
        'ExecuteQueuedModules.' +
          moduleName +
          '.' +
          eventFunctionQueue +
          '\n' +
          e2.stack
      );
    }
    if (_e !== undefined) throw _e;
    try {
      if (isAlQueueEnabled() && eventAuditLogFunction instanceof Function) {
        // Now run audit log stuff
        if (eventFunction instanceof Function)
          console.warn(
            'WARNING: Dual AuditLog/Normal variants of batched events just ran in the same module!'
          );
        let returnVal = await eventAuditLogFunction(procQueue);
        if (typeof returnVal === 'boolean' && returnVal === false) return queue;
      }
    } catch (e2) {
      _e = new Error(
        'ExecuteQueuedModules.' +
          moduleName +
          '.' +
          eventFunctionPrefixAuditLog +
          eventFunctionQueue +
          '\n' +
          e2.stack
      );
    }
    if (_e !== undefined) throw _e;
  }
  return queue;
}

export function EventHasExecution(event: string) {
  let eventFuncName = eventFunctions[event];
  for (var moduleName in moduleDefinitions) {
    let module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') continue;
    if (!isModuleEnabled(moduleName)) return;
    let eventFunction = module[eventFuncName];
    let eventAuditLogFunction =
      module[eventFunctionPrefixAuditLog + eventFuncName];
    let eventQueueFunction = module[eventFunctionQueue];
    let eventQueueAlFunction =
      module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (
      !(eventFunction instanceof Function) &&
      !(eventAuditLogFunction instanceof Function) &&
      !(eventQueueFunction instanceof Function) &&
      !(eventQueueAlFunction instanceof Function)
    )
      continue;
    return true;
  }
  return false;
}

export function EventHasOverride(event: string) {
  let bypass = EventOverrides[event];
  if (!(bypass instanceof Function)) return false;
  return true;
}

export function EventHasAuditLog(event: string) {
  let eventFuncName = eventFunctions[event];
  for (var moduleName in moduleDefinitions) {
    let module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') continue;
    if (!isModuleEnabled(moduleName)) continue;
    let eventAuditLogFunction =
      module[eventFunctionPrefixAuditLog + eventFuncName];
    let eventQueueFunction =
      module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (
      !(eventAuditLogFunction instanceof Function) &&
      !(eventQueueFunction instanceof Function)
    )
      continue;
    return true;
  }
  return false;
}

export function isQueueEnabled() {
  if (!config.modules.queue) return false;
  for (var moduleName in moduleDefinitions) {
    let module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') continue;
    if (!isModuleEnabled(moduleName)) continue;
    let eventFunction = module[eventFunctionQueue];
    let eventAuditLogFunction =
      module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (
      !(eventFunction instanceof Function) &&
      !(eventAuditLogFunction instanceof Function)
    )
      continue;
    return true;
  }
  return false;
}

export function isAlQueueEnabled() {
  if (!config.modules.queue) return false;
  for (var moduleName in moduleDefinitions) {
    let module = moduleDefinitions[moduleName];
    if (typeof module !== 'object') continue;
    if (!isModuleEnabled(moduleName)) continue;
    let eventAuditLogFunction =
      module[eventFunctionPrefixAuditLog + eventFunctionQueue];
    if (!(eventAuditLogFunction instanceof Function)) continue;
    return true;
  }
  return false;
}
