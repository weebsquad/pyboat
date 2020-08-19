import { commandsTable } from '../commands2/_init_';
import { moduleDefinitions } from '../modules/_init_';
import { config, globalConfig, Ranks } from '../config';
import * as utils from './utils';
/* eslint-disable prefer-destructuring */
/* eslint-disable import/no-mutable-exports */
export let cmdgroups = [];

function getCmdChannels() {
  if (typeof (config) === 'undefined') {
    return ['1'];
  }
  if (typeof (config.modules.counting) === 'undefined') {
    return ['1'];
  }
  if (typeof (config.modules.counting.channels) === 'undefined') {
    return ['1'];
  }

  return ['1'].concat(config.modules.counting.channels);
}

export async function filterLevel(message: discord.GuildMemberMessage, level: number): Promise<boolean> {
  const _ret = await utils.canMemberRun(level, message.member);
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
  return _ret;
}

export function checkOverrides(level: number, ovtext: string) {
  let disabled = false;
  ovtext = ovtext.toLowerCase();
  let cmdName; let modName; let
    groupName;
  if (ovtext.includes('.')) {
    const sp = ovtext.split('.');
    if (sp.length === 2) {
      // module + command
      cmdName = sp[1];
    } else if (sp.length === 3) {
      // module + group + command
      cmdName = `${sp[1]} ${sp[2]}`;
      groupName = sp[1];
    }
    modName = sp[0];
  } else {
    modName = ovtext;
  }
  const ovMod = config.modules.commands.overrides[`module.${modName}`];
  const ovCmd = cmdName !== undefined ? config.modules.commands.overrides[`command.${cmdName}`] : undefined;
  const ovGroup = groupName !== undefined ? config.modules.commands.overrides[`group.${groupName}`] : undefined;
  if (ovMod) {
    if (typeof (ovMod.disabled) === 'boolean') {
      disabled = ovMod.disabled;
    }
    if (typeof (ovMod.level) === 'number') {
      level = ovMod.level;
    }
  }
  if (ovGroup) {
    if (typeof (ovGroup.disabled) === 'boolean') {
      disabled = ovGroup.disabled;
    }
    if (typeof (ovGroup.level) === 'number') {
      level = ovGroup.level;
    }
  }
  if (ovCmd) {
    if (typeof (ovCmd.disabled) === 'boolean') {
      disabled = ovCmd.disabled;
    }
    if (typeof (ovCmd.level) === 'number') {
      level = ovCmd.level;
    }
  }
  if (level < 0) {
    level = 0;
  }
  if (disabled) {
    level = -1;
  }
  return level;
}

export function getFilters(overrideableInfo: string | null, level: number, owner = false, ga = false): discord.command.filters.ICommandFilter | Array<discord.command.filters.ICommandFilter> {
  const _checks = new Array<discord.command.filters.ICommandFilter>();
  const F = discord.command.filters;
  if (typeof overrideableInfo === 'string' && overrideableInfo.length > 1) {
    level = checkOverrides(level, overrideableInfo);
  }
  /*
  let anyNonSilent = false;
  args.forEach((level: any) => {
    const fnName = fnCheck.name;
    const msgRet = filterReturnMessages[fnName];
    let filter = F.custom(async (msg) => {
      const val = await fnCheck(msg); return val;
    }, msgRet);
    // if (config.modules.commands.hideNoAccess && config.modules.commands.hideNoAccess === true) {
    if ((fnName === 'filterOverridingGlobalAdmin' || fnName === 'filterGlobalAdmin') || (config.modules.commands.hideNoAccess && config.modules.commands.hideNoAccess === true)) {
      filter = F.silent(filter);
    } else {
      anyNonSilent = true;
    }
    _checks.push(filter);
  }); */

  if (ga === true) {
    return F.silent(F.custom(async (msg) => {
      const val = await filterGlobalAdmin(msg); return val;
    }));
  }
  if (owner === true) {
    const _f = F.custom(async (msg) => {
      const ownr = await filterActualOwner(msg);
      const ov = await filterOverridingGlobalAdmin(msg);
      return ownr || ov;
    }, 'Must be the server owner');
  } else {
    let _f = F.custom(async (msg) => {
      const ownr = await filterActualOwner(msg);
      const val = await filterLevel(msg, level);
      return ownr || val;
    }, `Must be bot level ${level}`);
    if (level < 0) {
      _f = F.custom(async (msg) => false, 'this command is disabled');
    }
    if (config.modules.commands.hideNoAccess && config.modules.commands.hideNoAccess === true) {
      _f = F.silent(_f);
    }
    return _f;
  }
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
  if (!opts.additionalPrefixes.includes(globalConfig.devPrefix) && opts.defaultPrefix.length > 0 && opts.defaultPrefix !== globalConfig.devPrefix) {
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
  if (typeof config === 'undefined') {
    return;
  }
  if (config.modules.commands.enabled !== true) {
    return;
  }
  if (cmdgroups.length !== 0) {
    cmdgroups = [];
  }
  // raw commands!
  for (const key in commandsTable) {
    const obj = commandsTable[key];
    let count = 0;
    if (typeof obj.InitializeCommands === 'function') {
      const newgroups = obj.InitializeCommands();
      if (Array.isArray(newgroups)) {
        newgroups.map((e) => {
          if (e instanceof discord.command.CommandGroup) {
            cmdgroups.push(e);
          }
        });
      } else if (newgroups instanceof discord.command.CommandGroup) {
        cmdgroups.push(newgroups);
      }
    } else {
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
    if (typeof obj.InitializeCommands === 'function') {
      const newgroups = obj.InitializeCommands();
      if (Array.isArray(newgroups)) {
        newgroups.map((e) => {
          if (e instanceof discord.command.CommandGroup) {
            cmdgroups.push(e);
          }
        });
      } else if (newgroups instanceof discord.command.CommandGroup) {
        cmdgroups.push(newgroups);
      }
    } else {
      for (const keyVar in obj) {
        const objCmd = obj[keyVar];
        if (objCmd instanceof discord.command.CommandGroup) {
          cmdgroups.push(objCmd);
          continue;
        }
      }
    }
  }
}
