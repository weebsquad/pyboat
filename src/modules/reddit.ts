import * as utils from '../lib/utils';
import {isModuleEnabled} from '../lib/eventHandler/routing'
import { config, guildId, globalConfig, InitializeConfig } from '../config';

enum FormatMode {
    'PLAIN', 'PRETTY'
}
class Subreddit {
    name: string;
    channelId: string;
    channel: discord.GuildTextChannel | discord.GuildNewsChannel | undefined = undefined;
    mode: FormatMode;
    stats: boolean;
    role: string | undefined;
    constructor(name: string, channel: string, mode: FormatMode, stats: boolean, role: string | undefined) {
        this.name = name;
        this.channelId = channel;
        this.mode = mode;
        this.stats = stats;
        this.role = role;
        return this;
    }
}

const kv = new pylon.KVNamespace('reddit');


export async function updateSubs(): Promise<void> {
    if(!isModuleEnabled('reddit')) return;
    const modConfig = config.modules.reddit;
    if(!modConfig || !modConfig.subs || !Array.isArray(modConfig.subs)) return;
    let subs: Array<Subreddit> = modConfig.subs.map((val: any) => {
        if(!val.channel || !val.mode || !val.stats || !val.name) return;
        return new Subreddit(val.name, val.channel, val.mode, val.stats, val.role);
    });
    subs = await Promise.all(subs.map(async (sub) => {
        const channel = await discord.getChannel(sub.channelId);
        if(!channel) return;
        if(channel.type !== discord.Channel.Type.GUILD_TEXT && channel.type !== discord.Channel.Type.GUILD_NEWS) return;
        sub.channel = channel;
        return sub;
    }));
    if(subs.length > 3) return;
    const times = await kv.get('lastUpdated') || {};
    let timesNew = times;
    await Promise.all(subs.map(async (sub) => {
        const req = await fetch(`https://www.reddit.com/r/${sub.name}/new.json`);
        if(req.status !== 200) return;
        const json: any = await req.json();
        if(!json.data || !json.data.children) return;
        const data: Array<any> = json.data.children;
    }))
    if(times !== timesNew) await kv.put('lastUpdated', timesNew);
}

async function sendPost(channel: discord.GuildTextChannel | discord.GuildNewsChannel, config: Subreddit, data: any) {

}