/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-empty-function */

import { config, Ranks } from '../config';
import * as c2 from '../lib/commands2';
import { registerChatRaw, registerChatSubCallback } from './commands';
import { language as i18n } from '../localization/interface';
import { saveMessage } from './admin';
import * as crons from '../lib/crons';

let init = false;
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
let eventHandlers: {[key: string]: Function[]} = {};
let cronHandlers: {[key: string]: Function} = {};

const _realConsole = Object.freeze(console); // override the default console because of rollup stripping raw console logs

export async function fetchCode(bypass = false) {
  if (init && !bypass) {
    return false;
  }
  init = true;
  if (config && config.modules && config.modules.customCode && config.modules.customCode.enabled === true && typeof config.modules.customCode.url === 'string' && config.modules.customCode.url.length > 3) {
    try {
      const req = await fetch(config.modules.customCode.url);
      const code = await req.text();
      await loadCodeEvents(code);
      return true;
    } catch (e) {
      _realConsole.error('customCode: error fetching http: ', e);
    }
  }
  return false;
}

function getBoxedObjects(full = false): any[] {
  const customDiscordObj: any = {};
  const customPylon: any = {};
  for (const key in discord) {
    if (key === 'command' || key === 'interactions') {
      continue;
    }
    if (key === 'on' || key === 'registerEventHandler') {
      if (full) {
        continue;
      }
      customDiscordObj[key] = function (event, handler) {
        if (!eventHandlers[event]) {
          eventHandlers[event] = [];
        }
        eventHandlers[event].push(handler);
      };
      continue;
    }

    customDiscordObj[key] = discord[key];
  }
  for (const key in pylon) {
    if (key === 'tasks') {
      if (full) {
        continue;
      }
      customPylon[key] = {};
      customPylon[key].cron = function (name, _, handler) {
        if (!cronHandlers[name] && crons.cronExists(name)) {
          cronHandlers[name] = handler;
        }
      };
      continue;
      /* const customTasks = {};
      for (const tkey in pylon[key]) {
        if (tkey === 'cron') {
          customTasks[tkey] = function (_) {

          };
        }
      }
      customPylon[key] = customTasks; */
    } else if (['requestCpuBurst', 'getCpuTime', 'getHeapStatistics', 'CpuBurstRequestError', 'CpuBurstTimeoutError'].includes(key)) {
      continue;
      /* customPylon[key] = function (_) {
      }; */
    } else {
      customPylon[key] = pylon[key];
    }
  }
  Object.freeze(customDiscordObj);
  Object.freeze(customPylon);
  if (!full) {
    return [['discord', 'pylon'], [customDiscordObj, customPylon]];
  }
  return [['console', '_realConsole', 'discord', 'pylon', 'fetch', 'sleep'], [_realConsole, _realConsole, customDiscordObj, customPylon, fetch, sleep]];
}

/*
function compileCode (src) {
  src = 'with (sandbox) {' + src + '}'
  const code = new Function('sandbox', src)

  return function (sandbox) {
    const sandboxProxy = new Proxy(sandbox, {has, get})
    return code(sandboxProxy)
  }
}
function has (target, key) {
  return true
}

function get (target, key) {
  if (key === Symbol.unscopables) return undefined
  return target[key]
} */

async function loadCodeEvents(code: string) {
  try {
    const boxedObjs = getBoxedObjects();
    const func = new Function(...boxedObjs[0], code);
    eventHandlers = {};
    cronHandlers = {};
    func.call({}, ...boxedObjs[1]);
    _realConsole.info(`customCode: Successfully loaded ${code.split('\n').length} lines of code`);
  } catch (e) {
    _realConsole.error('customCode: error whilst loading: ', e);
  }
}

async function handlePylonEvent(event, ...args) {
  if (!init) {
    await fetchCode();
  }
  if (Object.keys(eventHandlers).length < 1) {
    return;
  }

  const handlers = eventHandlers[event];
  if (handlers && handlers.length > 0) {
    const boxedObjs = getBoxedObjects(true);
    await Promise.all(handlers.map(async (fn) => {
      // call the user-defined handler for this event
      const eventArgs = [...args];
      const boxedFunc = new AsyncFunction([...boxedObjs[0], 'eventArgs', 'fn'], `
                try {
                    await fn(...eventArgs);
                } catch(_e) {
                  _realConsole.error('Error whilst executing custom event handler(${event})>', _e.message);
                }
            `);
      await boxedFunc.call({}, ...boxedObjs[1], eventArgs, fn);
    }));
  }
}

export async function executeCrons(name: string) {
  if (!init) {
    await fetchCode();
  }
  if (Object.keys(cronHandlers).length > 0) {
    if (cronHandlers[name]) {
      const boxedObjs = getBoxedObjects(true);
      const boxedFunc = new AsyncFunction([...boxedObjs[0], 'fn'], `
                try {
                    await fn();
                } catch(_e) {
                  _realConsole.error('Error whilst executing custom cron handler(${name})>', _e.message);
                }
            `);
      await boxedFunc.call({}, ...boxedObjs[1], cronHandlers[name]);
    }
  }
}

export async function OnAnyEvent(
  event: string,
  id: string,
  guildId: string,
  ...args: any
) {
  await handlePylonEvent.call({}, event, ...args);
}

export function subCode(subCmdGroup: discord.command.CommandGroup) {
  registerChatRaw(
    subCmdGroup,
    'reload',
    async (msg) => {
      const reloaded = await fetchCode(true);
      const res: any = await msg.inlineReply(async () => {
        if (reloaded) {
          return i18n.modules.customcode.reloaded;
        }
        return i18n.modules.customcode.not_enabled;
      });
      saveMessage(res);
    },
    {
      permissions: {
        level: Ranks.Guest,
        overrideableInfo: 'customcode.code.reload',
      },
    },
  );
}
export function InitializeCommands() {
  const _groupOptions = {
    description: 'CustomCode Commands',
  };

  const optsGroup = c2.getOpts(
    _groupOptions,
  );
  const cmdGroup = new discord.command.CommandGroup(optsGroup);
  registerChatSubCallback(cmdGroup, 'code', subCode, true);
  return cmdGroup;
}
