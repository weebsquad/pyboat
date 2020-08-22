// import { HandleCommand } from '../lib/commands';
import * as conf from '../config';
import * as commands2 from '../lib/commands2';
import * as utils from '../lib/utils';
import { logCustom, logDebug } from './logging/events/custom';

async function HandleDM(msg: discord.Message) {
  // console.log(`#DM:${msg.author.getTag()}>${msg.content}`);
}

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
    const validCmd = await commands2.isCommand(msg);
    if (!validCmd) {
      return;
    }

    if (!utils.isCommandsAuthorized(msg.member)) {
      await utils.reportBlockedAction(msg.member, `command execution: \`${utils.escapeString(msg.content)}\``);
      return;
    }
    let isDevCmd = false;
    if (typeof conf.globalConfig.devPrefix === 'string' && msg.content.length > conf.globalConfig.devPrefix.length) {
      if (msg.content.substr(0, conf.globalConfig.devPrefix.length) === conf.globalConfig.devPrefix) {
        isDevCmd = true;
        if (!utils.isGlobalAdmin(msg.author.id)) {
          return;
        }
      }
    }
    const cmdExec = await commands2.handleCommand(msg);
    if (typeof cmdExec === 'boolean' && cmdExec === true) {
      if (!isDevCmd) {
        await logCustom(
          'COMMANDS',
          'COMMAND_USED',
          new Map<string, any>([
            ['_COMMAND_NAME_', msg.content],
            ['_AUTHOR_', msg.author],
            ['_USER_ID_', msg.author.id],
            ['_MEMBER_', msg.member],
            ['_CHANNEL_ID_', msg.channelId],
          ]),
        );
      }

      return false;
    }
    if (typeof cmdExec === 'boolean' && !cmdExec) {
      /* let isCmd2 = await HandleCommand(msg);
        if (!isCmd2) await HandleChat(msg); */
    } else {
      // original cmd errored!
      const _e:Error = cmdExec;
      if (guildId === conf.globalConfig.masterGuild) {
        console.error(_e);
      }

      await logDebug(
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
