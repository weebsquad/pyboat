import { commandsTable } from '../commands2/_init_';
import { moduleDefinitions } from '../modules/_init_';
import { config } from '../config';

export const cmdgroups = [];
export const modulegroups = new Map<string, Array<any>>();
// let cmdChannels = [];

function getCmdChannels() {
  return [].concat(config.modules.counting.channels);
}

export function getOpts(curr: any): discord.command.ICommandGroupOptions {
  const F = discord.command.filters;
  const filterNoCmds = F.silent(F.not(F.or(F.isAdministrator(), F.channelIdIn(getCmdChannels()))));
  const opts = {
    label: 'default',
    description: 'default',
    defaultPrefix: config.modules.commands.prefix,
    register: <boolean>false,
  };
  if (typeof curr === 'object') {
    for (const key in curr) {
      if (typeof curr[key] === 'undefined') {
        continue;
      }
      opts[key] = curr[key];
    }
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
  for (const key in commandsTable) {
    const obj = commandsTable[key];

    let commandGroup;
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
}
