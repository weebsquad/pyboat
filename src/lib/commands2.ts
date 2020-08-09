import { commandsTable } from '../commands2/_init_';
import { moduleDefinitions } from '../modules/_init_';
import { config, globalConfig } from '../config';
import * as utils from './utils';

export const cmdgroups = [];

function getCmdChannels() {
  if (typeof (config.modules.counting) === 'undefined') {
    return ['1'];
  }
  if (typeof (config.modules.counting.channels) === 'undefined') {
    return ['1'];
  }

  return ['1'].concat(config.modules.counting.channels);
}

export async function filterAuthorized(message: discord.GuildMemberMessage): Promise<boolean> {
  const _ret = await utils.canMemberRun(globalConfig.Ranks.Authorized, message.member);
  return _ret;
}
export async function filterModerator(message: discord.GuildMemberMessage): Promise<boolean> {
  const _ret = await utils.canMemberRun(globalConfig.Ranks.Moderator, message.member);
  return _ret;
}
export async function filterAdmin(message: discord.GuildMemberMessage): Promise<boolean> {
  const _ret = await utils.canMemberRun(globalConfig.Ranks.Administrator, message.member);
  return _ret;
}
export async function filterLevelOwner(message: discord.GuildMemberMessage): Promise<boolean> {
  const _ret = await utils.canMemberRun(globalConfig.Ranks.Owner, message.member);
  return _ret;
}
export async function filterActualOwner(message: discord.GuildMemberMessage): Promise<boolean> {
  const guildThis = await message.getGuild();
  return guildThis.ownerId === message.author.id;
}
export function filterGlobalAdmin(message: discord.GuildMemberMessage): boolean {
  return utils.isGlobalAdmin(message.author.id);
}
export async function filterOverridingGlobalAdmin(message: discord.GuildMemberMessage): Promise<boolean> {
  const _ret = await utils.isGAOverride(message.author.id);
  console.log('filterOverridingGlobalAdmin', _ret);
  return _ret;
}

export function getFilters(...args: any): discord.command.filters.ICommandFilter | Array<discord.command.filters.ICommandFilter> {
  const filterReturnMessages: {[key: string]: string} = {
    filterAuthorized: 'Must be authorized',
    filterModerator: 'Must be moderator',
    filterAdmin: 'Must be admin',
    filterLevelOwner: 'Must be owner (level)',
    filterActualOwner: 'Must be the server owner',
    filterGlobalAdmin: 'Must be a global admin',
    filterOverridingGlobalAdmin: 'Must be a **overriding** global admin',
  };
  const _checks = new Array<discord.command.filters.ICommandFilter>();
  const F = discord.command.filters;
  let anyNonSilent = false;
  args.forEach((fnCheck: any) => {
    const fnName = fnCheck.name;
    const msgRet = filterReturnMessages[fnName];
    let filter = F.custom(async (msg) => {
      const val = await fnCheck(msg); return val;
    }, msgRet);
    if ((fnName === 'filterOverridingGlobalAdmin' || fnName === 'filterGlobalAdmin') || (config.modules.commands.hideNoAccess && config.modules.commands.hideNoAccess === true)) {
      filter = F.silent(filter);
    } else {
      anyNonSilent = true;
    }
    _checks.push(filter);
  });
  let _f = _checks.length > 1 ? F.or(..._checks) : _checks[0];
  if (anyNonSilent === false) {
    _f = F.silent(_f);
  }
  return _f;
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
