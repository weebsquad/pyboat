import { config, globalConfig, guildId } from '../config';

export async function OnMessageCreate(
  id: string,
  gid: string,
  message: discord.Message,
) {
  console.log('msg creat');
}
export async function OnMessageDelete(
  id: string,
  gid: string,
  messageDelete: discord.Event.IMessageDelete,
  oldMessage: discord.Message,
) {
  console.log('msg delet');
}
