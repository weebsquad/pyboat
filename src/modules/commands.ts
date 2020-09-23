// import { HandleCommand } from '../lib/commands';
import * as conf from '../config';
import * as commands2 from '../lib/commands2';
import * as utils from '../lib/utils';
import { logCustom, logDebug } from './logging/events/custom';
import { isIgnoredChannel, isIgnoredUser } from './logging/main';

interface ApiError extends discord.ApiError {
  messageExtended: string | undefined;
}

async function HandleDM(msg: discord.Message) {
  // console.log(`#DM:${msg.author.getTag()}>${msg.content}`);
}
const cooldowns: any = {};
export async function OnMessageCreate(
  id: string,
  guildId: string,
  msg: discord.Message,
) {
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
    await HandleDM(msg);
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
      await utils.reportBlockedAction(msg.member, `command execution: \`${utils.escapeString(msg.content)}\``);
      return;
    }

    cooldowns[msg.author.id] = Date.now();
    const cmdExec = await commands2.handleCommand(msg);
    if (typeof cmdExec === 'boolean' && cmdExec === true) {
      if (!isDevCmd) {
        if (!isIgnoredChannel(msg.channelId) && !isIgnoredUser(msg.member)) {
          logCustom(
            'COMMANDS',
            'COMMAND_USED',
            new Map<string, any>([
              ['_COMMAND_NAME_', utils.escapeString(msg.content)],
              ['_AUTHOR_', msg.author],
              ['_USER_', msg.author],
              ['_USER_ID_', msg.author.id],
              ['_MEMBER_', msg.member],
              ['_CHANNEL_ID_', msg.channelId],
            ]),
          );
        }
      }

      return false;
    }
    if (typeof cmdExec === 'boolean' && !cmdExec) {
      /* let isCmd2 = await HandleCommand(msg);
        if (!isCmd2) await HandleChat(msg); */
    } else {
      // original cmd errored!
      const _e: ApiError = cmdExec;
      if (_e.messageExtended && typeof _e.messageExtended === 'string') {
        try {
          const emsg: any = JSON.parse(_e.messageExtended).message;
          if (emsg && emsg.toLowerCase() === 'missing permissions') {
            return;
          }
        } catch (e) {}
      }
      await utils.logError(_e);

      logDebug(
        'BOT_ERROR',
        new Map<string, any>([
          [
            'ERROR',
            `Command Error on '${msg.content}': \n${_e.stack}`,
          ],
        ]),
      );
    }
  }
}
