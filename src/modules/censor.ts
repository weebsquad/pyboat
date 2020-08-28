import {config, globalConfig, Ranks, guildId} from '../config'


export async function checkMessage(msg: discord.GuildMemberMessage): Promise<boolean> {
    return false;
}
export async function OnMessageCreate(
    id: string,
    gid: string,
    message: discord.Message.AnyMessage,
  ) {
    if(message.guildId === null || !(message.member instanceof discord.GuildMember)) return;
    if(!(message instanceof discord.GuildMemberMessage)) return;
    const check = await checkMessage(message);
    if(check) {
        await message.delete();
        return false;
    }
  }