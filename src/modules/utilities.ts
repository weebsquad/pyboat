// TODO: reminders
// TODO: persistency module (nick, roles, server mute/deaf)
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as commands2 from '../lib/commands2';
import { config, globalConfig } from '../config';

const utilsConf = config.modules.utilities;
const snipeConf = utilsConf.snipe;
const F = discord.command.filters;

function getFilters(fnCheck: any, checkSub: string | undefined = undefined) {
  if (!(fnCheck instanceof Function) || typeof fnCheck !== 'function') {
    return;
  }
  /*
  if (typeof (checkSub) === 'string') {
    if (!utilsConf[checkSub] || !utilsConf[checkSub].enabled || !utilsConf[checkSub].enabled !== true) {
      let disabledF = F.custom((msg) => false, `${checkSub} is currently disabled`);
      if (config.modules.commands && config.modules.commands.hideDisabled && config.modules.commands.hideDisabled === true) {
        disabledF = F.silent(disabledF);
      }
      return disabledF;
    }
  } */
  return F.custom((msg) => fnCheck(msg), commands2.filterReturnMessages[fnCheck.toString()]);
}
const _groupOptions = {
  description: 'Utility Commands',
  filters: getFilters(commands2.filterAuthorized),
};

const optsGroup = commands2.getOpts(
  _groupOptions,
);
export const cmdGroup = new discord.command.CommandGroup(optsGroup);

/* SNIPE */
const snipekvs = new pylon.KVNamespace('snipe');
export async function AL_OnMessageDelete(
  id: string,
  guildId: string,
  log: discord.AuditLogEntry | unknown,
  ev: discord.Event.IMessageDelete,
  msg: discord.Message.AnyMessage | null,
) {
  if (
    msg === null
    || log instanceof discord.AuditLogEntry
    || msg.author === null
    || msg.webhookId !== null
    || msg.author.bot === true
  ) {
    return;
  }
  if (!utilsConf || !snipeConf || snipeConf.enabled !== true) {
    return;
  }
  if (utils.isBlacklisted(msg.member)) {
    return;
  }
  const dt = utils.decomposeSnowflake(msg.id).timestamp;
  const diff = new Date().getTime() - dt;
  if (diff >= snipeConf.delay) {
    return;
  }
  await snipekvs.put(msg.channelId, JSON.stringify(msg), {
    ttl: snipeConf.delay,
  });
}

cmdGroup.raw({ name: 'snipe', filters: getFilters(commands2.filterAuthorized, 'snipe') }, async (msg) => {
  let _sn: any = await snipekvs.get(msg.channelId);
  if (typeof _sn === 'string') {
    _sn = JSON.parse(_sn);
  }
  if (
    _sn === undefined
    || typeof _sn.author !== 'object'
    || typeof _sn.id !== 'string' || !(_sn instanceof discord.Message)
  ) {
    await msg.reply('Nothing to snipe.');
    return;
  }
  if (
    _sn.author.id === msg.author.id
    && !msg.member.can(discord.Permissions.ADMINISTRATOR)
  ) {
    await msg.reply('Nothing to snipe.');
    return;
  }
  const emb = new discord.Embed();
  const _usr = await discord.getUser(_sn.author.id);
  if (!_usr) {
    return;
  }
  emb.setAuthor({ name: _usr.getTag(), iconUrl: _usr.getAvatarUrl() });
  emb.setTimestamp(
    new Date(utils.decomposeSnowflake(_sn.id).timestamp).toISOString(),
  );
  emb.setFooter({
    iconUrl: msg.author.getAvatarUrl(),
    text: `Requested by: ${msg.author.getTag()}`,
  });
  emb.setDescription(_sn.content);
  emb.setColor(0x03fc52);
  await snipekvs.delete(msg.channelId);
  await msg.reply({
    embed: emb,
    content: `${_usr.toMention()} said ...`,
    allowedMentions: {},
  });
});
