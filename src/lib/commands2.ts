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
  const isAdmin = filterGlobalAdmin(message);
  if (!isAdmin) {
    return false;
  }
  const _ret = await utils.isGAOverride(message.author.id);
  if (!_ret) {
    if (typeof globalConfig.devPrefix === 'string' && message.content.length > globalConfig.devPrefix.length) {
      if (message.content.substr(0, globalConfig.devPrefix.length) === globalConfig.devPrefix) {
        return true;
      }
    }
  }
  return _ret;
}
class CmdOverride {
  level: number | undefined;
  disabled = false;
  channelsWhitelist: Array<string> | undefined;
  channelsBlacklist: Array<string> | undefined;
  rolesWhitelist: Array<string> | undefined;
  rolesBlacklist: Array<string> | undefined;
  bypassLevel: number | undefined;
}
export function checkOverrides(level: number, ovtext: string) {
  const retVal = new CmdOverride();
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
  // console.log(`ovtext = ${ovtext}`, `cmdname: ${cmdName}, modName: ${modName}, groupName: ${groupName}`)
  const checkStrings = [`module.${modName}`, `group.${groupName}`, `command.${cmdName}`];
  for (let i = 0; i < checkStrings.length; i++) {
    const obj = config.modules.commands.overrides[checkStrings[i]];
    if (typeof obj !== 'object') {
      continue;
    }
    if (typeof (obj.disabled) === 'boolean') {
      disabled = obj.disabled;
    }
    if (typeof (obj.level) === 'number') {
      level = obj.level;
    }
    if (Array.isArray(obj.channelsWhitelist)) {
      retVal.channelsWhitelist = obj.channelsWhitelist;
    }
    if (Array.isArray(obj.channelsBlacklist)) {
      retVal.channelsBlacklist = obj.channelsBlacklist;
    }
    if (Array.isArray(obj.rolesWhitelist)) {
      retVal.rolesWhitelist = obj.rolesWhitelist;
    }
    if (Array.isArray(obj.rolesBlacklist)) {
      retVal.rolesBlacklist = obj.rolesBlacklist;
    }
    if (typeof obj.bypassLevel === 'number') {
      retVal.bypassLevel = obj.bypassLevel;
    }
  }

  if (level < 0) {
    level = 0;
  }
  if (disabled) {
    retVal.disabled = true;
  }
  retVal.level = level;
  return retVal;
}

export function getFilters(overrideableInfo: string | null, level: number, owner = false, ga = false): discord.command.filters.ICommandFilter | Array<discord.command.filters.ICommandFilter> {
  const _checks = new Array<discord.command.filters.ICommandFilter>();
  const F = discord.command.filters;

  if (ga === true) {
    return F.silent(F.custom(async (msg) => {
      const val = filterGlobalAdmin(msg); return val;
    }));
  }
  if (owner === true) {
    const _f = F.custom(async (msg) => {
      const ownr = await filterActualOwner(msg);
      const ov = await filterOverridingGlobalAdmin(msg);
      return ownr || ov;
    }, 'Must be the server owner');
  } else {
    let ov: undefined | CmdOverride;
    if (typeof overrideableInfo === 'string' && overrideableInfo.length > 1 && typeof config.modules.commands.overrides === 'object') {
      ov = checkOverrides(level, overrideableInfo);
      level = ov.level;
    }
    const txtErr = [];
    if (level > 0) {
      txtErr.push(`Must be bot level ${level}`);
    }
    if (typeof ov === 'object') {
      if (Array.isArray(ov.rolesWhitelist)) {
        let rls = ov.rolesWhitelist;
        if (Array.isArray(ov.rolesBlacklist)) {
          rls = rls.filter((rl) => !ov.rolesBlacklist.includes(rl));
        }
        if (rls.length > 0) {
          txtErr.push(`Must have any of the following role(s): ${rls.map((rl) => `<@&${rl}>`).join(', ')}`);
        }
      } else if (Array.isArray(ov.rolesBlacklist) && ov.rolesBlacklist.length > 0) {
        txtErr.push(`Must not have any of the following role(s): ${ov.rolesBlacklist.map((rl) => `<@&${rl}>`).join(', ')}`);
      }
      if (Array.isArray(ov.channelsWhitelist)) {
        let chs = ov.channelsWhitelist;
        if (Array.isArray(ov.channelsBlacklist)) {
          chs = chs.filter((ch) => !ov.channelsBlacklist.includes(ch));
        }
        if (chs.length > 0) {
          txtErr.push(`Must be on the following channels: ${chs.map((ch) => `<#${ch}>`).join(', ')}`);
        }
      } else if (Array.isArray(ov.channelsBlacklist) && ov.channelsBlacklist.length > 0) {
        txtErr.push(`Must not be on the following channels: ${ov.channelsBlacklist.map((ch) => `<#${ch}>`).join(', ')}`);
      }
    }

    let _f = F.custom(async (msg) => {
      const ownr = await filterActualOwner(msg);
      const theirLevel = utils.getUserAuth(msg.member);
      const val = theirLevel >= level;
      const override = await filterOverridingGlobalAdmin(msg);
      if (ownr || override) {
        return true;
      }

      if (!ov) {
        return val;
      }
      if (typeof ov.bypassLevel === 'number') {
        if (theirLevel >= ov.bypassLevel) {
          return true;
        }
      }
      if (Array.isArray(ov.channelsBlacklist) && ov.channelsBlacklist.includes(msg.channelId)) {
        return false;
      }
      if (Array.isArray(ov.channelsWhitelist) && ov.channelsWhitelist.length > 0 && !ov.channelsWhitelist.includes(msg.channelId)) {
        return false;
      }
      if (Array.isArray(ov.rolesBlacklist)) {
        const matches = msg.member.roles.find((rlid) => ov.rolesBlacklist.includes(rlid));
        if (typeof matches !== 'undefined') {
          return false;
        }
      }
      if (Array.isArray(ov.rolesWhitelist) && ov.rolesWhitelist.length > 0) {
        const matches = msg.member.roles.find((rlid) => ov.rolesWhitelist.includes(rlid));
        if (typeof matches === 'undefined') {
          return false;
        }
      }
      return val;
    }, txtErr.join('\n'));
    if (ov && ov.disabled === true) {
      _f = F.custom(async (msg) => {
        const ownr = await filterActualOwner(msg);
        const override = await filterOverridingGlobalAdmin(msg);
        const theirLevel = utils.getUserAuth(msg.member);
        return ownr || override || (typeof ov.bypassLevel === 'number' && theirLevel >= ov.bypassLevel);
      }, 'this command is disabled');
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
  let firstPrefix = '!';
  let additionals = [];
  if (typeof config.modules.commands.prefix !== 'undefined') {
    if (typeof config.modules.commands.prefix === 'string') {
      firstPrefix = config.modules.commands.prefix;
    } else if (Array.isArray(config.modules.commands.prefix) && config.modules.commands.prefix.length > 0) {
      firstPrefix = config.modules.commands.prefix[0];
      if (config.modules.commands.prefix.length > 1) {
        additionals = config.modules.commands.prefix.slice(1);
      }
    }
  }

  const opts = {
    label: 'default',
    description: 'default',
    defaultPrefix: firstPrefix,
    register: <boolean>false,
    mentionPrefix: typeof config.modules.commands.allowMentionPrefix === 'boolean' ? config.modules.commands.allowMentionPrefix : false,
    additionalPrefixes: additionals,
  };
  if (typeof curr === 'object') {
    for (const key in curr) {
      if (typeof curr[key] === 'undefined') {
        continue;
      }
      opts[key] = curr[key];
    }
  }
  if (!opts.additionalPrefixes.includes(globalConfig.devPrefix) && opts.defaultPrefix !== globalConfig.devPrefix) {
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
