import { config, globalConfig, Ranks, guildId, ConfigError } from '../config';
import { UrlRegex, EmojiRegex, InviteRegex, ZalgoRegex, AsciiRegex } from '../constants/constants';
import * as utils from '../lib/utils';
import { logCustom } from './logging/events/custom';
import { getUserTag, getMemberTag } from './logging/main';
import * as infractions from './infractions';
import { Permissions } from '../lib/utils';

const kvPool = new pylon.KVNamespace('antiSpam');

const VALID_ACTIONS_INDIVIDUAL = ['KICK', 'SOFTBAN', 'BAN', 'MUTE', 'TEMPMUTE', 'TEMPBAN'];
const VALID_ACTIONS_GLOBAL = ['SLOWMODE', 'MASSBAN'];
const MAX_POOL_ENTRY_LIFETIME = 120 * 1000;
const ACTION_REASON = 'Too many spam violations';
class MessageEntry {
    authorId: string;
    id: string;
    ts: number;
    content: string;
    attachments: number | undefined = undefined;
    attachmentHashes: Array<string> | undefined = undefined;
    newlines: number | undefined = undefined;
    constructor(message: discord.GuildMemberMessage) {
        this.attachments = message.attachments.length > 0 ? message.attachments.length : undefined;
        this.authorId = message.author.id;
        this.id = message.id;
        this.ts = utils.decomposeSnowflake(this.id).timestamp;
        this.content = message.content;
    }
}



async function getAllPools() {
  
}