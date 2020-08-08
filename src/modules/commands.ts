// import { HandleCommand } from '../lib/commands';
import * as commands2 from '../lib/commands2';
import * as utils from '../lib/utils';
import * as conf from '../config';
import { logDebug, logCustom } from './logging/events/custom';

const { config } = conf;

async function HandleDM(msg: discord.Message) {
  // console.log(`#DM:${msg.author.getTag()}>${msg.content}`);
}

async function HandleChat(msg: discord.Message) {
  // let channel = (await msg.getChannel()) as discord.GuildTextChannel;
  // console.log(`#${channel.name}:${msg.author.getTag()}>${msg.content}`);
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
  if (msg.author.bot) {
    return;
  }
  if (!msg.member) {
    // is a DM
    await HandleDM(msg);
  } else {
    const isCmd = await commands2.handleCommand(msg);
    if (typeof isCmd === 'boolean' && isCmd === true) {
      /* console.log(
        `#[CMD (<${new Date(
          utils.decomposeSnowflake(id).timestamp
        ).toISOString()})>]:${msg.author.getTag()} > ${msg.content}`
      ); */
      await logCustom(
        'COMMAND_USED',
        new Map<string, any>([
          ['commandname', msg.content],
          ['author', msg.author],
          ['member', msg.member],
          ['channelid', msg.channelId],
        ]),
      );

      return false;
    }
    if (typeof isCmd === 'boolean' && !isCmd) {
      /* let isCmd2 = await HandleCommand(msg);
        if (!isCmd2) await HandleChat(msg); */
    } else {
      // original cmd errored!
      const _e:Error = isCmd;
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
