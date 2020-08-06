import { commandsTable } from '../commands2/_init_';
import { moduleDefinitions } from '../modules/_init_';
import { config } from '../config';

export let cmdgroups = [];
export let modulegroups = new Map<string, Array<any>>();
const cmdChannels = new Array<any>().concat(config.modules.counting.channels);

export function getOpts(curr: any) {
  const F = discord.command.filters;
  /*let filterNoCmds = F.silent(
    F.not(F.or(F.isAdministrator(), F.channelIdIn(cmdChannels)))
  );*/
  let opts = {
    label: 'default',
    description: 'default',
    defaultPrefix: config.modules.commands.prefix,
    register: false,
    filters: []
  };
  if (typeof curr === 'object') {
    for (var key in curr) {
      if (typeof curr[key] === 'undefined') continue;
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
  }*/

  /*console.log('before', opts.filters);
  opts['filters'].unshift(filterNoCmds);
  console.log('after', opts.filters);*/
  return opts;
}

export async function handleCommand(message: discord.Message) {
  if (cmdChannels.indexOf(message.channelId) > -1) return false;
  for (var key in cmdgroups) {
    let obj = cmdgroups[key] as discord.command.CommandGroup;
    let ret = await obj.checkMessage(message);
    if (ret === true) {
      //console.log('handleCom', `Found ${message.content} at ${key}`);
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
  for (var key in commandsTable) {
    let obj = commandsTable[key];

    let commandGroup;
    let count = 0;

    let newKeys = {};
    for (var keyCmd in obj) {
      let objCmd = obj[keyCmd];
      if (keyCmd.substr(0, 1) === '_') continue;
      if (objCmd instanceof discord.command.CommandGroup) {
        cmdgroups.push(objCmd);
        continue;
      }
      newKeys[keyCmd] = objCmd;
      count++;
    }

    if (Object.keys(newKeys).length < 1) continue;
    let opts = getOpts(
      obj['_groupOptions']
    ) as discord.command.ICommandGroupOptions;
    const newC = new discord.command.CommandGroup(opts).attach(newKeys);
    //console.log(opts);
    cmdgroups.push(newC);
    //console.info('Loaded ' + count + ' cmds from commands2.' + key);
  }
}
