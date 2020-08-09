import { commandsTable } from '../commands2/_init_';
import { moduleDefinitions } from '../modules/_init_';
import { config, globalConfig } from '../config';
import * as utils from './utils';

export const cmdgroups = [];
export const modulegroups = new Map<string, Array<any>>();
// let cmdChannels = [];

function getCmdChannels() {
  if (typeof (config.modules.counting) === 'undefined') {
    return ['1'];
  }
  if (typeof (config.modules.counting.channels) === 'undefined') {
    return ['1'];
  }

  return ['1'].concat(config.modules.counting.channels);
}

export const filterReturnMessages: {[key: string]: string} = {
  filterAuthorized: 'Must be authorized',
};
export function filterAuthorized(message: discord.GuildMemberMessage): boolean {
  const _check = utils.canMemberRun(globalConfig.Ranks.Authorized, message.member);
  return _check;
}

export function getOpts(curr: any): discord.command.ICommandGroupOptions {
  const F = discord.command.filters;
  // const filterNoCmds = F.silent(F.not(F.or(F.isAdministrator(), F.channelIdIn(getCmdChannels()))));
  let pref = '!';
  if (config.modules.commands !== undefined && typeof config.modules.commands.prefix === 'string') {
    pref = config.modules.commands.prefix;
  }
  const opts = {
    label: 'default',
    description: 'default',
    defaultPrefix: config.modules.commands.prefix,
    register: <boolean>false,
    mentionPrefix: config.modules.commands.allowMentionPrefix,
    additionalPrefixes: [],
  };
  if (typeof curr === 'object') {
    for (const key in curr) {
      if (typeof curr[key] === 'undefined') {
        continue;
      }
      opts[key] = curr[key];
    }
  }
  if (!opts.additionalPrefixes.includes(globalConfig.devPrefix) && opts.defaultPrefix.length > 0) {
    opts.additionalPrefixes.push(globalConfig.devPrefix);
  }
  /*
  if (typeof curr['filters'] !== 'undefined') {
    if (!Array.isArray(curr['filters'])) {
      opts['filters'].push(curr['filters']);
    } else {
      curr.filters.forEach(function(ele) {
        opts.filters.push(ele);
      });
    }
  } */
  // todo: cmds channels
  // if(Array.isArray(opts['filters'])) opts['filters'].unshift(filterNoCmds);
  // if(Array.isArray(opts['filters']) && opts['filters'].length === 0) delete opts['filters'];
  const newo = <any>opts;
  return newo;
}

export async function isCommand(message: discord.Message) {
  if (getCmdChannels().includes(message.channelId)) {
    return false;
  }
  for (const key in cmdgroups) {
    const obj: discord.command.CommandGroup = cmdgroups[key];
    const ret = await obj.checkMessage(message);
    // console.log(`Checking ${message.content} against`, obj, ` returned ${ret}`);
    if (ret === true) {
      return true;
    }
  }
  return false;
}

export async function handleCommand(message: discord.Message) {
  if (getCmdChannels().includes(message.channelId)) {
    return false;
  }
  for (const key in cmdgroups) {
    const obj: discord.command.CommandGroup = cmdgroups[key];
    const ret = await obj.checkMessage(message);
    if (ret === true) {
      try {
        await obj.handleMessage(message);
        return true;
      } catch (e) {
        return e;
      }
    }
  }
  return false;
}

export function InitializeCommands2() {
  if (config.modules.commands.enabled !== true) {
    return;
  }
  // raw commands!
  for (const key in commandsTable) {
    const obj = commandsTable[key];
    let count = 0;

    const newKeys = {};
    for (const keyCmd in obj) {
      const objCmd = obj[keyCmd];
      if (keyCmd.substr(0, 1) === '_') {
        continue;
      }
      if (objCmd instanceof discord.command.CommandGroup) {
        cmdgroups.push(objCmd);
        continue;
      }
      newKeys[keyCmd] = objCmd;
      count += 1;
    }

    if (Object.keys(newKeys).length < 1) {
      continue;
    }
    const opts = getOpts(
      obj._groupOptions,
    ) as discord.command.ICommandGroupOptions;
    const newC = new discord.command.CommandGroup(opts).attach(newKeys);
    cmdgroups.push(newC);
    // console.info('Loaded ' + count + ' cmds from commands2.' + key);
  }
  // modules!
  for (const key in moduleDefinitions) {
    if (!config.modules[key]) {
      continue;
    }
    if (!config.modules[key].enabled || config.modules[key].enabled !== true) {
      continue;
    }
    const obj: any = moduleDefinitions[key];
    for (const keyVar in obj) {
      const objCmd = obj[keyVar];
      if (objCmd instanceof discord.command.CommandGroup) {
        // console.log(key, keyVar, objCmd);
        cmdgroups.push(objCmd);
        continue;
      }
    }
  }
}
