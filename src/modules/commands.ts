// import { HandleCommand } from '../lib/commands';
import * as conf from '../config';
import * as commands2 from '../lib/commands2';
import * as utils from '../lib/utils';
import * as admin from './admin';
import { logCustom, logDebug } from './logging/events/custom';
import { isIgnoredChannel, isIgnoredUser, parseMessageContent } from './logging/main';
import { isModuleEnabled } from '../lib/eventHandler/routing';

const errorsDisplay = ['missing permissions'];
const cmdErrorDebounces: string[] = [];
const TEMPORARY_SLASH_COMMANDS_MODULE_LIMITER = '';
const SLASH_COMMANDS_LIMIT = 0;

type SlashCommandRegistry = {
  config: discord.interactions.commands.ICommandConfig<any>;
  extras: CommandExtras;
}
type SlashCommandGroupRegistry = {
  config: discord.interactions.commands.ICommandConfig<any>;
  extras?: CommandExtras;
}
export const registeredSlashCommands: SlashCommandRegistry[] = [];
export const registeredSlashCommandGroups: SlashCommandGroupRegistry[] = [];

interface ApiError extends discord.ApiError {
  messageExtended: string | undefined;
}

type CommandPermissionsCheck = {
  overrideableInfo?: string;
  level?: number;
  owner?: boolean;
  globalAdmin?: boolean;
}

type CommandExtras = {
  permissions?: CommandPermissionsCheck;
  staticAck?: boolean;
  module?: string;
  parent?: string;
};

export function SlashGroupHasSubcommands(groupName: string) {
  return registeredSlashCommands.filter((v) => v.extras.parent === groupName).length > 0;
}

function getTopLevelSlashCommands() {
  return [...registeredSlashCommands.filter((v) => !v.extras.parent), ...registeredSlashCommandGroups.filter((v) => !v.extras.parent)];
}
function getFullCommandName(name: string, parent?: string) {
  if (!parent) {
    return name;
  }
  const parentF = registeredSlashCommandGroups.find((v) => v.config.name === parent);
  if (!parentF || !parentF.extras) {
    return `${parentF.config.name} ${name}`;
  }
  return getFullCommandName(`${parentF.config.name} ${name}`, parentF.extras.parent);
}
async function executeSlash(sconf: discord.interactions.commands.ICommandConfig<any>, extras: CommandExtras, callback: discord.interactions.commands.HandlerFunction<any>, interaction: discord.interactions.commands.SlashCommandInteraction, ...args: any) {
  const fullCmdName = getFullCommandName(sconf.name, extras.parent);
  if (typeof conf.config !== 'object' || conf.config === null || typeof conf.config === 'undefined') {
    const ret = await conf.InitializeConfig();
    if (!ret) {
      return;
    }
  }
  console.log(`Executing slash command [${fullCmdName}]`);
  if (extras.module) {
    if (!isModuleEnabled(extras.module)) {
      try {
        await interaction.acknowledge(false);
      } catch (_) {}
      await interaction.respondEphemeral('**This command is disabled**');
      return;
    }
  }
  if (typeof cooldowns[interaction.member.user.id] === 'number') {
    const diff = Date.now() - cooldowns[interaction.member.user.id];
    // global cmd cooldown!
    if (diff < 750) {
      return;
    }
  }
  if (interaction.member.user.bot && !utils.isCommandsAuthorized(interaction.member)) {
    return;
  }
  if (!utils.isCommandsAuthorized(interaction.member)) {
    await interaction.acknowledge(false);
    await utils.reportBlockedAction(interaction.member, `slash command execution: \`${fullCmdName}\``);
    return;
  }
  if (extras.permissions) {
    const guild = await interaction.getGuild();
    const perms = await commands2.checkPerms(interaction.member, guild, interaction.channelId, extras.permissions.overrideableInfo, extras.permissions.level, extras.permissions.owner, extras.permissions.globalAdmin);
    if (!perms.access) {
      try {
        await interaction.acknowledge(false);
      } catch (_) {}
      if (perms.errors.length > 0) {
        if (perms.errors.includes('This command is disabled')) {
          await interaction.respondEphemeral('This command is disabled');
        } else {
          await interaction.respondEphemeral(`**You can't use that command!**\n__You must meet all of following criteria:__\n\n${perms.errors.join('\n')}`);
        }
      }
      return;
    }
  }
  try {
    // @ts-ignore
    const retV = await callback(interaction, ...args);
    if (typeof retV === 'boolean') {
      if (retV === false) {
        try {
          await interaction.acknowledge(false);
        } catch (_) {}
        return;
      }
    }
    if (typeof extras.staticAck === 'boolean') {
      try {
        await interaction.acknowledge(extras.staticAck);
      } catch (_) {}
    }
  } catch (_e) {
    try {
      await interaction.acknowledge(false);
    } catch (_) {}
    utils.logError(_e);

    if (_e.messageExtended && typeof _e.messageExtended === 'string') {
      try {
        const emsg: any = JSON.parse(_e.messageExtended).message;
        if (emsg && errorsDisplay.includes(emsg.toLowerCase())) {
          await interaction.respondEphemeral(`**There has been an error executing this command**\n\n__${emsg}__`);
          return;
        }
      } catch (e) {}
    }
    await interaction.respondEphemeral('**There has been an error executing this command**\n\nThis has been logged and the bot developer will look into it shortly.');
    logDebug(
      'BOT_ERROR',
      new Map<string, any>([
        [
          'ERROR',
          `Slash Command Error on '${fullCmdName}': \n${_e.stack}`,
        ],
      ]),
    );
  }
  cooldowns[interaction.member.user.id] = Date.now();

  if (!isIgnoredChannel(interaction.channelId) && !isIgnoredUser(interaction.member)) {
    let argsString = '';
    if (sconf.options && args.length > 0) {
      for (const i in args) {
        for (const key in args[i]) {
          const val = args[i][key];
          let valOutput = '';
          if (typeof val === 'string') {
            valOutput = val;
          } else if (typeof val === 'boolean') {
            valOutput = val === true ? 'true' : 'false';
          } else if (typeof val === 'number') {
            valOutput = `${val}`;
          } else if (val instanceof discord.GuildMember) {
            valOutput = val.user.getTag();
          } else if (val instanceof discord.Role) {
            valOutput = val.name;
          } else if (val instanceof discord.GuildChannel) {
            valOutput = val.name;
          } else {
            console.warn(`Argument ${key} typing not found??`);
          }
          if (valOutput !== '') {
            if (argsString !== '') {
              argsString += ' , ';
            }
            argsString += `\`${key}\`:\`${utils.escapeString(valOutput, true)}\``;
          }
        }
      }
    }
    if (argsString !== '') {
      argsString = ` with arguments ${argsString}`;
    }
    logCustom(
      'COMMANDS',
      'SLASH_COMMAND_USED',
      new Map<string, any>([
        ['_COMMAND_NAME_', fullCmdName],
        ['_AUTHOR_', interaction.member.user],
        ['_USER_', interaction.member.user],
        ['_USER_ID_', interaction.member.user.id],
        ['_MEMBER_', interaction.member],
        ['_CHANNEL_ID_', interaction.channelId],
        ['_ARGUMENTS_', argsString],
      ]),
    );
  }
}

export function registerSlash(sconf: discord.interactions.commands.ICommandConfig<any>, callback: discord.interactions.commands.HandlerFunction<any>, extras: CommandExtras) {
  if (TEMPORARY_SLASH_COMMANDS_MODULE_LIMITER !== '' && extras.module !== TEMPORARY_SLASH_COMMANDS_MODULE_LIMITER) {
    return;
  }
  if (getTopLevelSlashCommands().length >= SLASH_COMMANDS_LIMIT) {
    return;
  }
  // add module name to the comamnd's description
  /* const prettyModule = `${extras.module.substr(0,1).toUpperCase()}${extras.module.substr(1).toLowerCase()}`;
  sconf.description = `[${prettyModule}] ${sconf.description}`; */
  discord.interactions.commands.register(sconf, async (interaction, ...args: any) => {
    await executeSlash(sconf, extras, callback, interaction, ...args);
  });
  registeredSlashCommands.push({ config: sconf, extras });
}

export function registerSlashGroup(sconf: discord.interactions.commands.ICommandConfig<any>, extras?: CommandExtras, parentGroup?: discord.interactions.commands.SlashCommandGroup) {
  registeredSlashCommandGroups.push({ config: sconf, extras });
  if (TEMPORARY_SLASH_COMMANDS_MODULE_LIMITER !== '' && extras.module !== TEMPORARY_SLASH_COMMANDS_MODULE_LIMITER) {
    return null;
  }
  if (getTopLevelSlashCommands().length >= SLASH_COMMANDS_LIMIT) {
    return null;
  }
  if (parentGroup) {
    return parentGroup.registerGroup(sconf);
  }
  return discord.interactions.commands.registerGroup(sconf);
}

export function registerSlashSub(parent: discord.interactions.commands.SlashCommandGroup, sconf: discord.interactions.commands.ICommandConfig<any>, callback: discord.interactions.commands.HandlerFunction<any>, extras: CommandExtras) {
  if (TEMPORARY_SLASH_COMMANDS_MODULE_LIMITER !== '' && extras.module !== TEMPORARY_SLASH_COMMANDS_MODULE_LIMITER) {
    return;
  }
  if (!parent) {
    return;
  }
  // add module name to the comamnd's description
  /* const prettyModule = `${extras.module.substr(0,1).toUpperCase()}${extras.module.substr(1).toLowerCase()}`;
  sconf.description = `[${prettyModule}] ${sconf.description}`; */
  parent.register(sconf, async (interaction, ...args: any) => {
    await executeSlash(sconf, extras, callback, interaction, ...args);
  });
  registeredSlashCommands.push({ config: sconf, extras });
}

export async function interactionChannelRespond(interaction: discord.interactions.commands.SlashCommandInteraction, data: discord.Message.IOutgoingMessageOptions | string): Promise<discord.Message | false> {
  const channel = await interaction.getChannel();
  if (!(channel instanceof discord.GuildTextChannel) && !(channel instanceof discord.GuildNewsChannel)) {
    return false;
  }
  // @ts-ignore
  const msgRet = await channel.sendMessage(data);
  if (msgRet instanceof discord.Message) {
    // @ts-ignore
    await admin.saveMessage(msgRet);
    return msgRet;
  }
  return false;
}

export async function executeChatCommand(opts: string | discord.command.ICommandOptions, extras: CommandExtras, callback: discord.command.CommandHandler<any>, msg: discord.Message, ...args: any) {
  cmdErrorDebounces.push(msg.id);
  if (msg.member.user.bot && !utils.isCommandsAuthorized(msg.member)) {
    return;
  }
  if (!utils.isCommandsAuthorized(msg.member)) {
    return;
  }
  if (extras.permissions) {
    const guild = await msg.getGuild();
    const perms = await commands2.checkPerms(msg.member, guild, msg.channelId, extras.permissions.overrideableInfo, extras.permissions.level, extras.permissions.owner, extras.permissions.globalAdmin);
    if (!perms.access) {
      if (perms.errors.length > 0) {
        let txtErr = '';
        if (perms.errors.includes('This command is disabled')) {
          txtErr = 'This command is disabled';
        } else {
          txtErr = `__You must meet all of following criteria:__\n${perms.errors.join('\n')}`;
        }
        const emb = new discord.Embed();
        emb.setTitle(`${discord.decor.Emojis.LOCK} You can't use that command!`);
        emb.setColor(0xff0505);
        emb.setDescription(txtErr);
        let sentMsg;
        try {
          sentMsg = await msg.inlineReply({ allowedMentions: {}, content: '', embed: emb });
        } catch (_) {
          sentMsg = await msg.reply({ allowedMentions: {}, content: '', embed: emb });
        }
        if (sentMsg) {
          await admin.saveMessage(sentMsg, true);
        }
      }
      return;
    }
  }
  // @ts-ignore
  await callback(msg, ...args);

  const checkDebounce = cmdErrorDebounces.findIndex((v) => v === msg.id);
  if (checkDebounce > -1) {
    cmdErrorDebounces.splice(checkDebounce, 1);
  }
}

export function registerChatOn(parentGroup: discord.command.CommandGroup, opts: string | discord.command.ICommandOptions, argsParser: discord.command.ArgumentsParser<any>, callback: discord.command.CommandHandler<any>, extras: CommandExtras) {
  parentGroup.on(opts, argsParser, async (...args) => {
    await executeChatCommand(opts, extras, callback, ...args);
  });
}

export function registerChatRaw(parentGroup: discord.command.CommandGroup, opts: string | discord.command.ICommandOptions, callback: discord.command.CommandHandler<any>, extras: CommandExtras) {
  parentGroup.raw(opts, async (...args) => {
    await executeChatCommand(opts, extras, callback, ...args);
  });
}

export function registerChatSubCallback(parentGroup: discord.command.CommandGroup, opts: string | discord.command.ICommandOptions, func: (group: discord.command.CommandGroup) => void, applyDefault = true) {
  const newg = parentGroup.subcommand(opts, (newgr) => {
    func(newgr);
    if (applyDefault) {
      // @ts-ignore
      newgr.defaultRaw(async (msg) => {
        await unknownHandler(msg, newgr);
      });
    }
  });
  return newg;
}

export function registerChatSub(parentGroup: discord.command.CommandGroup, opts: string | discord.command.ICommandOptions, applyDefault = true) {
  return registerChatSubCallback(parentGroup, opts, () => undefined, applyDefault);
}

export async function chatErrorHandler({ message, command }, error: Error | discord.command.ArgumentError<any>): Promise<void> {
  try {
    cmdErrorDebounces.push(message.id);
    let msgReply = '';
    let cmdInitial: string | Array<string>;
    if (message.content.includes(' ')) {
      cmdInitial = [];
      const splitted = message.content.split(' ');
      for (const key in splitted) {
        const val = splitted[key];
        cmdInitial.push(val);
        if (val === command.options.name) {
          break;
        }
      }
      cmdInitial = cmdInitial.join(' ');
    } else {
      cmdInitial = message.content;
    }
    if (error instanceof discord.command.ArgumentError) {
      const argsUsage = command.argumentConfigList.map((v) => {
        let typeArg = v[1].type;
        if (typeArg.includes('Optional')) {
          typeArg = typeArg.split('Optional').join('');
          return `[${v[0]}: ${typeArg}]`;
        }
        return `<${v[0]}: ${typeArg}>`;
      }).join(' ');
      const usageString = `${cmdInitial} ${argsUsage}`;
      let matchingArgErrorName = command.argumentConfigList.find((v) => {
        const typeArg = v[1].type.toLowerCase();
        if (error.argumentConfig.type.toLowerCase() === typeArg) {
          return true;
        }
        return false;
      });
      if (matchingArgErrorName) {
        [matchingArgErrorName] = matchingArgErrorName;
      }
      msgReply = `${discord.decor.Emojis.WARNING} Argument Error (\`${matchingArgErrorName}\`: __${error.message}__)\n\`\`\`\n${usageString}\n\`\`\``;
    } else if (errorsDisplay.includes(error.message.toLowerCase())) {
      msgReply = `${discord.decor.Emojis.X} **There was an error running that command**\n[${error.name}] - __${error.message}__`;
    } else {
      utils.logError(error);
      msgReply = `${discord.decor.Emojis.X} **There was an error running that command**\n__This has been reported to the Bot Developer__`;
      logDebug(
        'BOT_ERROR',
        new Map<string, any>([
          [
            'ERROR',
            `Command Error on [${cmdInitial}]\nMessage: '${message.content}'\n${error.stack}`,
          ],
        ]),
      );
    }

    if (msgReply.length > 0) {
      let sentMsg;
      try {
        sentMsg = await message.inlineReply({ allowedMentions: {}, content: msgReply });
      } catch (_) {
        sentMsg = await message.reply({ allowedMentions: {}, content: msgReply });
      }
      if (sentMsg) {
        await admin.saveMessage(sentMsg);
      }
    }
  } catch (e) {
    utils.logError(e);
  }
}

export async function unknownHandler(message, group) {
  let msgReply = '';
  let cmdInitial: string | Array<string>;
  if (message.content.includes(' ')) {
    cmdInitial = [];
    const splitted = message.content.split(' ');
    for (const key in splitted) {
      const val = splitted[key];
      cmdInitial.push(val);
      if (val === group.options.name) {
        break;
      }
    }
    cmdInitial = cmdInitial.join(' ');
  } else {
    cmdInitial = message.content;
  }
  const subNames = [];
  for (const [key, value] of group.commandExecutors) {
    if (!value.aliasOf) {
      subNames.push(key);
    }
  }
  if (subNames.length > 0) {
    msgReply = `Unknown sub-command for \`${utils.escapeString(<string>cmdInitial, true)}\`, try:\n${subNames.join(', ')}`;
  }

  if (msgReply.length > 0) {
    let sentMsg;
    try {
      sentMsg = await message.inlineReply({ allowedMentions: {}, content: msgReply });
    } catch (_) {
      sentMsg = await message.reply({ allowedMentions: {}, content: msgReply });
    }
    if (sentMsg) {
      await admin.saveMessage(sentMsg);
    }
  }
}
const cooldowns: any = {};
export async function OnMessageCreate(
  id: string,
  guildId: string,
  msg: discord.Message,
) {
  if (cmdErrorDebounces.length > 50) {
    console.error('Memory leak on commands cmdErrorDebounces');
  }
  if (
    !msg.content
    || typeof msg.content !== 'string'
    || msg.type !== discord.Message.Type.DEFAULT
  ) {
    return;
  }
  if (msg.author === null) {
    return;
  }

  if (!msg.member) {
    // is a DM

  } else {
    if (msg.author.bot && !utils.isCommandsAuthorized(msg.member)) {
      return;
    }
    if (typeof cooldowns[msg.author.id] === 'number') {
      const diff = Date.now() - cooldowns[msg.author.id];
      // global cmd cooldown!
      if (diff < 750) {
        return;
      }
    }
    const validCmd = await commands2.isCommand(msg);
    if (!validCmd) {
      return;
    }
    const guild = await msg.getGuild();
    const me = await guild!.getMember(discord.getBotId());
    const channel = await msg.getChannel();
    if (!channel || !me || channel instanceof discord.DmChannel) {
      return;
    }
    let isDevCmd = false;
    if (typeof conf.globalConfig.devPrefix === 'string' && msg.content.length > conf.globalConfig.devPrefix.length && msg.content.substr(0, conf.globalConfig.devPrefix.length) === conf.globalConfig.devPrefix) {
      isDevCmd = true;
    }
    if (!isDevCmd || !utils.isGlobalAdmin(msg.author.id)) {
      if (!channel.canMember(me, discord.Permissions.READ_MESSAGES) || !channel.canMember(me, discord.Permissions.SEND_MESSAGES) || !channel.canMember(me, discord.Permissions.EMBED_LINKS) || !channel.canMember(me, discord.Permissions.EXTERNAL_EMOJIS)) {
        return;
      }
    }
    if (isDevCmd === true && !utils.isGlobalAdmin(msg.author.id)) {
      return;
    }
    if (!utils.isCommandsAuthorized(msg.member)) {
      await utils.reportBlockedAction(msg.member, `command execution: \`${utils.escapeString(msg.content, true)}\``);
      return;
    }

    cooldowns[msg.author.id] = Date.now();
    const cmdExec = await commands2.handleCommand(msg);
    // @ts-ignore
    const trySave = await admin.saveMessage(msg, true);
    if (!trySave) {
      await admin.adminPool.editTransact<admin.TrackedMessage>(msg.id, (prev) => {
        prev.bot = true;
        return prev;
      });
    }
    if (typeof cmdExec === 'boolean' && cmdExec === true) {
      const checkDebounce = cmdErrorDebounces.findIndex((v) => v === msg.id);
      if (checkDebounce > -1) {
        cmdErrorDebounces.splice(checkDebounce, 1);
        return;
      }
      if (!isDevCmd) {
        if (!isIgnoredChannel(msg.channelId) && !isIgnoredUser(msg.member)) {
          const parsedTxt = await utils.parseMentionables(msg.content);
          logCustom(
            'COMMANDS',
            'CHAT_COMMAND_USED',
            new Map<string, any>([
              ['_COMMAND_NAME_', utils.escapeString(parsedTxt, true)],
              ['_AUTHOR_', msg.author],
              ['_USER_', msg.author],
              ['_USER_ID_', msg.author.id],
              ['_MEMBER_', msg.member],
              ['_CHANNEL_ID_', msg.channelId],
            ]),
          );
        }
      }
    }
  }
}
