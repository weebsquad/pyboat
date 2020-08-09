// import { HandleCommand } from '../lib/commands';
import * as commands2 from '../lib/commands2';
import * as utils from '../lib/utils';
import * as conf from '../config';
import { logDebug, logCustom } from './logging/events/custom';

const { config } = conf;

async function HandleDM(msg: discord.Message) {
  // c onsole.log(`#DM:${msg.author.getTag()}>${msg.content}`);
}

async function HandleChat(msg: discord.Message) {
  // let channel = (await msg.getChannel()) as discord.GuildTextChannel;
  // c onsole.log(`#${channel.name}:${msg.author.getTag()}>${msg.content}`);
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
    const cmdExec = await commands2.handleCommand(msg);
    if (typeof cmdExec === 'boolean' && cmdExec === true) {
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
            `Command Error on '${msg.content}': ${_e.message}\n${_e.stack}`,
          ],
        ]),
      );
      /*
        if (typeof config.modules.errorsChannel === 'string') {
          let ch = await discord.getGuildTextChannel(
            config.modules.errorsChannel
          );
          if (ch !== null) {

            let cc = new utils.FakeConsole(ch);
            cc.log(
              `Command Error on '${msg.content}' ${_e.message}\n${_e.stack}`
            );
          }
        } */
    }
  }
}
