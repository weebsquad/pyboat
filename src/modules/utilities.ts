// TODO: reminders
// TODO: persistency module (nick, roles, server mute/deaf)
// TODO: translation reply command
// TODO: jumbo, urban, kittyapi
import * as utils from '../lib/utils';
import * as config from '../config';

/*
const F = discord.command.filters;
export const _groupOptions = {
  additionalPrefixes: ['p/'],
  description: 'Dev commands',
  filters: F.custom(
    (message) => utils.getUserAuth(message.author.id) >= 4,
    'Must be bot admin'
  )
};

const optsGroup = commands2.getOpts(
  _groupOptions
) as discord.command.ICommandGroupOptions;
export const cmdGroup = new discord.command.CommandGroup(optsGroup);
*/

/* SNIPE */
const snipekvs = new pylon.KVNamespace('snipe');
const SNIPE_DELAY = 2 * 60 * 1000;
export async function AL_OnMessageDelete(
  id: string,
  guildId: string,
  log: discord.AuditLogEntry | Object,
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
  const dt = utils.decomposeSnowflake(msg.id).timestamp;
  const diff = new Date().getTime() - dt;
  if (diff >= SNIPE_DELAY) {
    return;
  }
  await snipekvs.put(msg.channelId, JSON.stringify(msg), {
    ttl: SNIPE_DELAY,
  });
}
