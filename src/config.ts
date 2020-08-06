import * as messages from './modules/logging/messages';
import { GuildConfig, ChannelConfig, chPlain, chEmbed } from './modules/logging/classes';
export const guildId = discord.getGuildId();
export enum Ranks {
    "Guest" = 0,
    "Authorized" = 10,
    "Moderator" = 50,
    "Administrator" = 100,
    "Owner" = 200,
}
export const globalConfig = <any>{
    admins: ['344837487526412300'],
    masterGuild: '307927177154789386',
    masterWebhook: 'https://discordapp.com/api/webhooks/740960911208218665/9CMljWo69PRk-ApcRjP1Z7YqlKML7sxv5a-jv79FWwFSRfwLzQ69iAvXrReK5k4kI7Gf',
    metalApi: {
        key: 'spdyzhvtzdavalwcvrxxzz9OX',
        url: 'https://metalruller.com/api/discordMiddleman.php'
    },
    ranks: Ranks
}

const guildConfigs = <any>{
    '565323632751149103': { // pink
        levels: {
          users: {
            '344837487526412300': 1337, // Metal
            '545581357812678656': 200, // megu
            '248137443184738305': 200, // matt
            '128425121969864704': 200, // chom
            '135856734542495744': 100, // mage
            '187026807919345664': 100, // d1nzy
            '162160695868129280': 100, // luke
          },
          roles: {
              '576416312142725131': 200, // dot role
              '565325264981327873': 200, // op role
              '567988684193005568': 100, // admin role
              '565338597755060225': 10, // member role
          }
        },
        modules: {
            queue: true, // eventhandler auto queueing on ratelimits
            logging: { // event logging module
                enabled: true,
                logChannels: new Map<discord.Snowflake, GuildConfig>([[guildId, new GuildConfig(new Map<discord.Snowflake, ChannelConfig>([
                    ['729980275550846978', chPlain(['*'], ['DEBUG'], true, true)],
                    [
                        '735875360943767562', chEmbed('gamer', ['*'], ['TYPING_START.*', 'MESSAGE_REACTION_ADD', 'MESSAGE_REACTION_REMOVE', 'MESSAGE_REACTION_REMOVE_ALL', 'DEBUG'],
                        'https://icon-library.com/images/icon-gamer/icon-gamer-20.jpg',
                        'https://discord.com/api/webhooks/738853991537967124/dxlcHFwQwCLu80E4FUbQsT0tI3C-JlCg1sfPCDd7unFv7K9FZC_w0poSUOwmXEaxKJqc',
                        true,
                        false)
                    ],
                    ['738432465819009084', chPlain(['DEBUG'], [], true, false)]
                ]))]]),
                messages: messages.messages, // defaults
                messagesAuditLogs: messages.messagesAuditLogs, // defaults
                userTag: '_MENTION_',
                actorTag: '_MENTION_',
                reasonPrefix: ' with reason `_REASON_RAW_`',
                suffixReasonToAuditlog: true
            },
            commands: { // for the both commands system, though only prefix and enabled are used for cmdsv2
                enabled: true,
                prefix: ['$'],
                allowMentionPrefix: true,
                seperator: ' ',
                prefixParameters: ['--', '-'] // -- has to be first actually due to indexOf detection
            },
            translation: { // translation module, react with flags on messages to trigger translation for them
                enabled: true,
                googleApi: {
                    key: 'AIzaSyAUxN0Q-BTzrw6Hs_BXaX3YbZJsWSekNMk'
                }
            },
            utilities: { // todo
                enabled: true
            },
            roleManagement: { // for group srv only
                enabled: true,
                lowestHoistRole: '666575421281927218',
                botRoleRP: '700009450760568932',
                botRole: '565335659066294272',
                memberRole: '565338597755060225',
                memberRoleRP: '575239761149558785'
            },
            antiPing: { // owo
                enabled: false,
                logChannel: '729980275550846978',
                actualCaughtMessage: 'no pings',
                caughtMessages: ['ok buddy', 'nonoononoon', 'bad'],
                instaDeletePings: false,
                banOnLeave: false,
                pingsForAutoMute: 3,
                emojiActions: {
                    '👌': 'IgnoreOnce',
                    '☑️': 'Ignore',
                    '🔇': 'Mute',
                    '👢': 'Kick',
                    '🔨': 'Ban'
                },
                targets: {
                    users: {
                    whitelist: [],
                    blacklist: []
                    },
                    roles: {
                        whitelist: ['565482292303101953'],
                        blacklist: []
                    },
                    channels: {
                        whitelist: ['565333823869550592'],
                        blacklist: []
                    },
                    categories: {
                        whitelist: [],
                        blacklist: []
                    }
                },
                staff: ['567988684193005568'],
                bypass: {
                    users: [],
                    roles: ['596738480391061505']
                },
                muteRole: '576330934010511361'
            },
            counting: { // counting module
                enabled: true,
                channels: ['703167521431355412'],
                keyCount: 'counting_current',
                keyLastUser: 'counting_lastuser',
                keyLastMid: 'counting_lastmid',
                autoPins: {
                    single: [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999], // Individual === check
                    repeating: [1000], // Modulus check
                    repeatingLast: [69] // Everytime these digits are found on last X of current number, it will trigger
                },
                useWebhook: false,
                webhook: '712259047080067113/Kr5f2pcumxiHHQ35klk1cyCHv3UlN7cK2bw0Wx6dSwpAUZFVeygvPFasrgLyishGe66k'
            }
        }
      },
  '307927177154789386': { // metals test srv
    levels: {
      users: {
        '344837487526412300': 1337, // Metal
        '343241331746930699': 100, // metals alt
      },
      roles: {
          '691950782949490698': 50, // admin role
      }
    },
    modules: {
        queue: true, // eventhandler auto queueing on ratelimits
        logging: { // event logging module
            enabled: true,
            debug: true, // debug mode (enables debug logs and extra info)
            logChannels: new Map<discord.Snowflake, GuildConfig>([[guildId, new GuildConfig(new Map<discord.Snowflake, ChannelConfig>([
                    ['740997800749170698', chPlain(['*'], ['DEBUG'], true, false)],
                    ['735780975145123901', chPlain(['DEBUG'], [], true, true)],
            ]))]]),
            messages: messages.messages, // defaults
            messagesAuditLogs: messages.messagesAuditLogs, // defaults
            userTag: '_MENTION_',
            actorTag: '_MENTION_',
            reasonPrefix: ' with reason `_REASON_RAW_`',
            suffixReasonToAuditlog: true
        },
        commands: { // for the both commands system, though only prefix and enabled are used for cmdsv2
            enabled: true,
            prefix: ['$'],
            allowMentionPrefix: true,
            seperator: ' ',
            prefixParameters: ['--', '-'] // -- has to be first actually due to indexOf detection
        },
        translation: { // translation module, react with flags on messages to trigger translation for them
            enabled: true,
            googleApi: {
                key: 'AIzaSyAUxN0Q-BTzrw6Hs_BXaX3YbZJsWSekNMk'
            }
        },
        utilities: { // todo
            enabled: true
        },
        roleManagement: { // for group srv only
            enabled: false,
            lowestHoistRole: '666575421281927218',
            botRoleRP: '700009450760568932',
            botRole: '565335659066294272',
            memberRole: '565338597755060225',
            memberRoleRP: '575239761149558785'
        },
        antiPing: { // owo
            enabled: false,
            logChannel: '729980275550846978',
            actualCaughtMessage: 'no pings',
            caughtMessages: ['ok buddy', 'nonoononoon', 'bad'],
            instaDeletePings: false,
            banOnLeave: false,
            pingsForAutoMute: 3,
            emojiActions: {
                '👌': 'IgnoreOnce',
                '☑️': 'Ignore',
                '🔇': 'Mute',
                '👢': 'Kick',
                '🔨': 'Ban'
            },
            targets: {
                users: {
                whitelist: [],
                blacklist: []
                },
                roles: {
                    whitelist: ['565482292303101953'],
                    blacklist: []
                },
                channels: {
                    whitelist: ['565333823869550592'],
                    blacklist: []
                },
                categories: {
                    whitelist: [],
                    blacklist: []
                }
            },
            staff: ['567988684193005568'],
            bypass: {
                users: [],
                roles: ['596738480391061505']
            },
            muteRole: '576330934010511361'
        },
        counting: { // counting module
            enabled: true,
            channels: ['740880532325531659'],
            keyCount: 'counting_current',
            keyLastUser: 'counting_lastuser',
            keyLastMid: 'counting_lastmid',
            autoPins: {
                single: [1, 69, 100, 200, 420, 666, 1000, 1337, 6969, 9001, 10000, 99999], // Individual === check
                repeating: [1000], // Modulus check
                repeatingLast: [69] // Everytime these digits are found on last X of current number, it will trigger
            },
            useWebhook: false,
            webhook: '712259047080067113/Kr5f2pcumxiHHQ35klk1cyCHv3UlN7cK2bw0Wx6dSwpAUZFVeygvPFasrgLyishGe66k'
        }
    }
  }
};

export function getGuildConfig(gid: string) {
    return guildConfigs[gid];
}
export const config = getGuildConfig(guildId);
export function isGlobalAdmin(userid: string) {
    return globalConfig.admins.includes(userid);
}