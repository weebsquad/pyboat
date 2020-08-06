import { config } from '../config';
import * as utils from './utils';
import { commandsFiles } from '../commands/_init_';

export let commands = new Array<Command>();

export class CommandArgument {
  Type: string;
  Position: number;
  Required: boolean = false;
  constructor(type: string, pos: number, required: boolean = false) {
    if (
      type !== 'User' &&
      type !== 'GuildMember' &&
      type !== 'Channel' &&
      type !== 'Guild' &&
      type !== 'Role' &&
      type !== 'Text'
    )
      return;
    this.Type = type;
    this.Position = pos;
    this.Required = required;
    return this;
  }
}

export class Command {
  Name: string;
  Disabled: boolean = false;
  Hidden: boolean = false;
  Authorization: number = 0;
  Aliases: Array<string> = [];
  Description: string;
  Arguments: Array<CommandArgument>;
  Category: string = 'uncategorized';
  Execute: Function;
  Parameters: Array<string> = [];
  ConfigModuleAccess: Array<string> = [];
  Usage: string;
  constructor(
    name: string,
    description: string = '',
    authorization: number = 0,
    usage: string = ''
  ) {
    this.Name = name;
    this.Description = description;
    this.Authorization = authorization;
    this.Aliases = [];
    this.Arguments = [];
    this.Usage = usage;

    return this;
  }
}

export class ResolvedCommandArgument {
  Type: string;
  Position: number;
  Data: any;
  constructor(type: string, pos: number, data: object) {
    this.Type = type;
    this.Position = pos;
    this.Data = data;
    return this;
  }
}

export class CommandData {
  Message: discord.Message;
  Author: discord.User;
  AuthorGuild: discord.GuildMember;
  GuildId: discord.Snowflake;
  Channel: discord.GuildTextChannel;
  UserAuthorization: number;
  Command: Command;
  PassedArguments: Array<string>;
  PassedParameters: Array<string>;
  ResolvedArguments: Array<ResolvedCommandArgument>;
  Guild: discord.Guild;
  Bot: discord.User;
  BotGuild: discord.GuildMember;
  ConfigData: {};
  async FillData() {
    try {
      if (this.GuildId) {
        this.Channel = (await this.Message.getChannel()) as discord.GuildTextChannel;
        this.Guild = await this.Message.getGuild();
        this.BotGuild = await this.Guild.getMember(discord.getBotId());
      } else {
        this.Channel = (await this.Message.getChannel()) as discord.GuildTextChannel;
      }
      this.Bot = (await utils.getUser(discord.getBotId())) as discord.User;
    } catch (e) {
      console.error(this);
      console.error(e);
    }
    return this;
  }
  async ResolveArguments() {
    if (!this.Command.Arguments || this.Command.Arguments.length == 0)
      return this;

    let error = '';
    let textFinal = false;
    let textLast = '';
    let textLastPos = 0;
    let _argData = [];

    for (var i = 0; i < this.Command.Arguments.length; i++) {
      let expectedArgument = this.Command.Arguments[i];
      let passedArgument = this.PassedArguments[i];
      if (
        typeof passedArgument === 'undefined' &&
        expectedArgument.Required == true
      ) {
        error =
          'Missing argument (' +
          expectedArgument.Type +
          ') at position ' +
          (i + 1).toString();
        return error;
      }
      let type = expectedArgument.Type;
      let _arg = new ResolvedCommandArgument(type, i + 1, {});
      let tryUserId = passedArgument;
      if (typeof tryUserId === 'string')
        tryUserId = tryUserId.replace(/\D/g, ''); // Remove nonnumeric
      switch (type) {
        case 'User':
          let usr = await new CommandArgumentUser(tryUserId).FillData();
          if (typeof usr !== 'boolean' && usr.User && usr.User.discriminator) {
            _argData[i] = usr;
            _arg.Data = usr as CommandArgumentUser;
          }
          break;
        case 'GuildMember':
          let gm = await new CommandArgumentGuildMember(
            tryUserId,
            this.GuildId
          ).FillData();
          if (typeof gm !== 'boolean' && gm.User && gm.User.discriminator) {
            _argData[i] = gm;
            _arg.Data = gm as CommandArgumentGuildMember;
          }
          break;
        case 'Guild':
          break;
        case 'Channel':
          break;
        case 'Role':
          break;
        case 'Text':
          _argData[i] = passedArgument;
          _arg.Data = passedArgument;
          if (i == this.Command.Arguments.length - 1) {
            // Last iteration
            let rest = this.PassedArguments.slice(i).join(
              config.modules.commands.seperator
            );
            _argData[i] = rest;
            _arg.Data = rest;
          }
          break;
      }
      if (typeof _argData[i] === 'undefined') {
        if (expectedArgument.Required === true) {
          error =
            'Invalid argument passed at position ' +
            (i + 1).toString() +
            ' (needs ' +
            type +
            ') ';
          return error;
        }
      } else {
        this.ResolvedArguments.push(_arg);
      }
    }
    if (error !== '') return error;
    return this;
  }
  constructor(msg: discord.Message, cmd: Command, args: Array<string>) {
    this.Message = msg;
    this.Command = cmd;
    this.Author = msg.author;
    this.UserAuthorization = utils.getUserAuth(msg.author.id);
    if (msg.guildId) {
      this.AuthorGuild = msg.member;
      this.GuildId = msg.guildId;
    }
    this.PassedArguments = args;
    this.ResolvedArguments = new Array<ResolvedCommandArgument>();
    this.PassedParameters = [];
    this.ConfigData = {};

    if (this.Command.ConfigModuleAccess.length > 0) {
      this.Command.ConfigModuleAccess.forEach(function(module) {
        if (module.indexOf('.') > -1) {

          let data = utils.strToObj(
            module,
            module.split('.').reduce(function(obj, i) { return obj[i]}, config)
          );
          this.ConfigData = Object.assign({}, this.ConfigData, data);
        } else {
          if (typeof config[module] !== 'undefined') {
            this.ConfigData = Object.assign(
              {},
              this.ConfigData,
              config[module]
            );
          }
        }
      }, this);
    }

    return this;
  }
}

export class CommandArgumentUser {
  Id: string;
  User: discord.User;
  Authorization: number;
  async FillData() {
    try {
      this.User = await utils.getUser(this.Id);
      return this;
    } catch (e) {
      return false;
    }
  }
  constructor(userid: string) {
    this.Id = userid;
    this.Authorization = utils.getUserAuth(userid);
    return this;
  }
}

export class CommandArgumentGuildMember {
  Id: string;
  User: discord.User;
  GuildId: string;
  GuildMember: discord.GuildMember;
  Authorization: number;
  async FillData() {
    try {
      this.User = await utils.getUser(this.Id);
      if (typeof this.GuildId === 'string' && this.GuildId.length > 2)
        this.GuildMember = await (
          await discord.getGuild(this.GuildId)
        ).getMember(this.Id);
      return this;
    } catch (e) {
      return false;
    }
  }
  constructor(userid: string, guildid: string) {
    this.Id = userid;
    if (guildid && guildid.length > 2) this.GuildId = guildid;
    this.Authorization = utils.getUserAuth(userid);
    return this;
  }
}

export function GetCommand(name) {
  name = name.toLowerCase();
  return commands.find(function(h) {
    return h.Name == name || h.Aliases.indexOf(name) > -1;
  });
}

export async function HandleCommand(msg: discord.Message) {
  if (Object.keys(commands).length == 0) InitializeCommands();
  let content = msg.content;
  if (typeof content !== 'string') return false;
  let botId = await discord.getBotId();
  let cmdName = content;
  let usedPrefix = '';
  if (Array.isArray(config.modules.commands.prefix)) {
    config.modules.commands.prefix.forEach(function(pref) {
      if (content.substr(0, pref.length) === pref && usedPrefix === '') {
        usedPrefix = pref;
        cmdName = content.substr(pref.length);
      }
    });
  } else {
    if (
      content.substr(0, config.modules.commands.seperator.length) ===
      config.modules.commands.seperator
    ) {
      cmdName = content.substr(config.modules.commands.seperator.length);
      usedPrefix = config.modules.commands.seperator;
    }
  }

  if (usedPrefix === '' && config.modules.commands.allowMentionPrefix) {
    let checks = [`<@${botId}>`, `<@!${botId}>`];
    checks.forEach(function(pref) {
      if (content.substr(0, pref.length) === pref && usedPrefix === '') {
        usedPrefix = pref;
        // Let's remove whitespace after prefix
        let afterPref = content.substr(pref.length).split('');
        if (afterPref.length > 0) {
          let cmdStartIndex = 0;
          for (var i = 0; i < afterPref.length; i++) {
            let currChar = afterPref[i];
            if (currChar !== ' ') {
              cmdStartIndex = i;
              break;
            }
            cmdStartIndex++;
          }
          cmdName = content.substr(pref.length + cmdStartIndex);
        }
      }
    });
  }
  if (usedPrefix === '') return;
  if (cmdName.indexOf(' ') > -1) cmdName = cmdName.split(' ')[0];

  let command = GetCommand(cmdName);
  let argsContent = content.substr(cmdName.length + 1);
  if (!command) return false; // No command found
  // Check parameters before arguments
  let params = [];
  if (command.Parameters.length > 0) {
    for (var i = 0; i < command.Parameters.length; i++) {
      let indParam = -1;
      let usedPrefix;
      config.modules.commands.prefixParameters.forEach(function(prefixParam) {
        if (
          indParam !== -1 ||
          (typeof usedPrefix !== 'undefined' &&
            usedPrefix.length > prefixParam.length)
        )
          return;
        indParam = argsContent.indexOf(prefixParam + command.Parameters[i]);
        usedPrefix = prefixParam;
      });
      if (indParam === -1 || typeof usedPrefix === 'undefined') continue;
      params.push(command.Parameters[i]);
      argsContent =
        argsContent.substr(0, indParam) +
        argsContent.substr(
          indParam + (usedPrefix + command.Parameters[i]).length
        );
      // now lets remove extra whitespace before/after this
      let argsCChars = argsContent.split(config.modules.commands.seperator);
      let newArr = [];
      let foundSpace = false;
      for (var i2 = 0; i2 < argsCChars.length; i2++) {
        if (argsCChars[i2] === '') {
          if (!foundSpace) {
            foundSpace = true;
          }
        } else {
          argsCChars.splice(i2).forEach(function(cc) {
            newArr.push(cc);
          });
        }
      }

      argsContent = newArr.join(config.modules.commands.seperator);
    }
  }
  let args = argsContent.split(config.modules.commands.seperator);
  args = args.filter(function(el) {
    return el !== '';
  });
  let CmdData = await new CommandData(msg, command, args).FillData();
  if (params.length > 0) CmdData.PassedParameters = params;
  if (command.Authorization > CmdData.UserAuthorization) return false; // User has no perm to use this

  let test = await CmdData.ResolveArguments();
  if (typeof test === 'string') {
    // Error
    await msg.reply(test);
    return false;
  }
  CmdData = test;
  await command.Execute(CmdData);
  return true;
}

export function AddCommand(cmd: Command) {
  for (var i = 0; i < 1 + cmd.Aliases.length; i++) {
    let _c = cmd.Name;
    if (i > 0) _c = cmd.Aliases[i - 1];
    let _ex = GetCommand(_c);
    if (_ex) {
      console.error(
        'Tried to add duplicate command/alias "' +
          _c +
          '", already defined in "' +
          _ex.Category +
          '"'
      );
      return;
    }
  }
  // Auto usage
  if (cmd.Usage === '' && cmd.Arguments.length > 0) {
    let ufinal = '';
    let usages = [];
    for (var i = 0; i < cmd.Arguments.length; i++) {
      let stringu = '';
      let arg = cmd.Arguments[i];
      // Check curr pos exists
      if (usages[arg.Position]) {
        let curr = usages[arg.Position];
        if (curr.indexOf('<') > -1 && curr.indexOf('>') > -1) {
          // Previous argument was required
          usages[arg.Position] = curr.split('>').join() + '/' + arg.Type + '>';
        } else {
          // Previous argument was optional
          usages[arg.Position] = curr.split(']').join() + '/' + arg.Type + ']';
        }
      } else {
        // Nothing exists yet
        if (arg.Required === true) {
          usages[arg.Position] = `<${arg.Type}>`;
        } else {
          usages[arg.Position] = `[${arg.Type}]`;
        }
      }
    }
    cmd.Usage = usages.join(config.modules.commands.seperator).substr(1);
  }
  commands.push(cmd);
}

export function InitializeCommands() {
  for (var key in commandsFiles) {
    let obj = commandsFiles[key];
    let commandlist = obj();
    let count = 0;
    commandlist.forEach(function(cmd) {
      cmd.Category = key;
      AddCommand(cmd);
      count++;
    });
    //console.info('Loaded ' + count + ' cmds from commands1.' + key);
  }
}
