/*

		THIS FILE IS AUTO-GENERATED, DO NOT EDIT IT MANUALLY!

*/

export interface IRootObject {
    time_units: ITime_units;
    ranks: IRanks;
    config: IConfig;
    modules: IModules;
}
export interface ITime_units {
    ti_full: ITi_full;
    ti_short: ITi_short;
    months: IMonths;
}
export interface ITi_full {
    singular: ISingular;
    plural: IPlural;
}
export interface ISingular {
    decade: string;
    year: string;
    month: string;
    week: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
    millisecond: string;
}
export interface IPlural {
    decade: string;
    year: string;
    month: string;
    week: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
    millisecond: string;
}
export interface ITi_short {
    decade: string;
    year: string;
    month: string;
    week: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
    millisecond: string;
}
export interface IMonths {
    mo_full: IMo_full;
    mo_short: IMo_short;
}
export interface IMo_full {
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
}
export interface IMo_short {
    january: string;
    february: string;
    march: string;
    april: string;
    may: string;
    june: string;
    july: string;
    august: string;
    september: string;
    october: string;
    november: string;
    december: string;
}
export interface IRanks {
    guest: string;
    authorized: string;
    moderator: string;
    administrator: string;
    owner: string;
}
export interface IConfig {
    cant_download_file: string;
    cant_delete_message: string;
    incorrect_guild_id: string;
    updated_config: string;
    error_updating_config: string;
    get_config: string;
    get_default_config: string;
    deleted_config: string;
}
export interface IModules {
    logging: ILogging;
    tags: ITags;
    utilities: IUtilities;
    starboard: IStarboard;
    translation: ITranslation;
    reddit: IReddit;
    commands: ICommands;
    censor: ICensor;
    counting: ICounting;
    antispam: IAntispam;
}
export interface ILogging {
    l_terms: IL_terms;
    l_messages: IL_messages;
    l_messages_logs: IL_messages_logs;
}
export interface IL_terms {
    webhook: string;
    none: string;
    jump_to_message: string;
    yes: string;
    no: string;
    trueval: string;
    falseval: string;
    enabled: string;
    disabled: string;
    added: string;
    removed: string;
    changed: string;
    edited_emoji: string;
    edited_emoji_roles: string;
    removed_emoji: string;
    changed_roles: string;
    added_emoji: string;
    default_message_notifs: IDefault_message_notifs;
    explicit_filter: IExplicit_filter;
    verification_level: IVerification_level;
}
export interface IDefault_message_notifs {
    all_messages: string;
    only_mentions: string;
}
export interface IExplicit_filter {
    disabled: string;
    without_roles: string;
    all_members: string;
}
export interface IVerification_level {
    none: string;
    low: string;
    medium: string;
    high: string;
    very_high: string;
}
export interface IL_messages {
    DEBUG: IDEBUG;
    '|REACTROLES': {
        ROLE_ADDED: string;
        ROLE_REMOVED: string;
    };
    '|PERSIST': {
        SAVED: string;
        RESTORED: string;
    };
    '|INFRACTIONS': {
        KICK: string;
        MUTE: string;
        UNMUTE: string;
        TEMPMUTE: string;
        TEMPMUTE_EXPIRED: string;
        BAN: string;
        UNBAN: string;
        SOFTBAN: string;
        TEMPBAN: string;
        TEMPBAN_EXPIRED: string;
        MASSBAN: string;
        EDITED: string;
        DELETED: string;
    };
    '|CORE': {
        BLACKLISTED_USER_ACTION: string;
    };
    '|COMMANDS': {
        CHAT_COMMAND_USED: string;
        SLASH_COMMAND_USED: string;
    };
    '|ADMIN': {
        CLEAN: string;
        LOCKED_CHANNEL: string;
        UNLOCKED_CHANNEL: string;
        LOCKED_GUILD: string;
        UNLOCKED_GUILD: string;
        SLOWMODE: string;
        TEMPROLE: string;
        TEMPROLE_EXPIRED: string;
        ROLE_ADDED: string;
        ROLE_REMOVED: string;
        NICKNAME: string;
    };
    '|ANTISPAM': {
        ANTIRAID: string;
        ANTIRAID_VIOLATION: string;
        VIOLATION: string;
    };
    '|CENSOR': {
        CENSORED_MESSAGE: string;
        CENSORED_USERNAME: string;
    };
    '|ANTIPING': {
        FAIL_MARK_MEMBER_NOT_FOUND: string;
        FAIL_MARK_UNMUTE: string;
        FAIL_MARK_ACTION: string;
        MARK_SUCCESS: string;
        LEFT_BANNED: string;
        TRIGGERED: string;
        TRIGGERED_MUTE: string;
    };
    CHANNEL_CREATE: ICHANNEL_CREATE;
    CHANNEL_UPDATE: ICHANNEL_UPDATE;
    CHANNEL_DELETE: ICHANNEL_DELETE;
    CHANNEL_PINS_UPDATE: ICHANNEL_PINS_UPDATE;
    GUILD_MEMBER_ADD: IGUILD_MEMBER_ADD;
    GUILD_MEMBER_REMOVE: IGUILD_MEMBER_REMOVE;
    GUILD_BAN_ADD: IGUILD_BAN_ADD;
    GUILD_BAN_REMOVE: IGUILD_BAN_REMOVE;
    GUILD_MEMBER_UPDATE: IGUILD_MEMBER_UPDATE;
    GUILD_CREATE: IGUILD_CREATE;
    GUILD_INTEGRATIONS_UPDATE: IGUILD_INTEGRATIONS_UPDATE;
    GUILD_EMOJIS_UPDATE: IGUILD_EMOJIS_UPDATE;
    GUILD_UPDATE: IGUILD_UPDATE;
    GUILD_ROLE_CREATE: IGUILD_ROLE_CREATE;
    GUILD_ROLE_UPDATE: IGUILD_ROLE_UPDATE;
    GUILD_ROLE_DELETE: IGUILD_ROLE_DELETE;
    MESSAGE_UPDATE: IMESSAGE_UPDATE;
    MESSAGE_DELETE: IMESSAGE_DELETE;
    MESSAGE_DELETE_BULK: IMESSAGE_DELETE_BULK;
    MESSAGE_REACTION_ADD: IMESSAGE_REACTION_ADD;
    MESSAGE_REACTION_REMOVE: IMESSAGE_REACTION_REMOVE;
    MESSAGE_REACTION_REMOVE_ALL: IMESSAGE_REACTION_REMOVE_ALL;
    USER_UPDATE: IUSER_UPDATE;
    VOICE_STATE_UPDATE: IVOICE_STATE_UPDATE;
    VOICE_SERVER_UPDATE: IVOICE_SERVER_UPDATE;
    TYPING_START: ITYPING_START;
    WEBHOOKS_UPDATE: IWEBHOOKS_UPDATE;
}
export interface IDEBUG {
    BOT_ERROR: string;
    BOT_STARTED: string;
    RAW_EVENT: string;
    CRON_RAN: string;
    BLACKLISTED_USER_ACTION: string;
}
export interface ICHANNEL_CREATE {
    CHANNEL_CREATED: string;
    DM_CHANNEL_OPENED?: string;
}
export interface ICHANNEL_UPDATE {
    NAME_CHANGED: string;
    CATEGORY_CHANGED: string;
    TYPE_CHANGED: string;
    NSFW_CHANGED: string;
    TOPIC_CHANGED: string;
    SLOWMODE_CHANGED: string;
    BITRATE_CHANGED: string;
    USERLIMIT_CHANGED: string;
    PERMS_SYNCED: string;
    PERMS_CHANGED: string;
}
export interface ICHANNEL_DELETE {
    CHANNEL_DELETED: string;
}
export interface ICHANNEL_PINS_UPDATE {
    MESSAGE_PINNED: string;
    MESSAGE_UNPINNED: string;
}
export interface IGUILD_MEMBER_ADD {
    BOT_ADDED: string;
    MEMBER_JOIN?: string;
}
export interface IGUILD_MEMBER_REMOVE {
    MEMBER_LEFT?: string;
    MEMBER_KICKED?: string;
}
export interface IGUILD_BAN_ADD {
    MEMBER_BANNED: string;
}
export interface IGUILD_BAN_REMOVE {
    MEMBER_UNBANNED: string;
}
export interface IGUILD_MEMBER_UPDATE {
    NICK_ADDED: string;
    NICK_CHANGED: string;
    NICK_REMOVED: string;
    ROLES_ADDED: string;
    ROLES_REMOVED: string;
    ROLES_CHANGED: string;
    AVATAR_ADDED?: string;
    AVATAR_REMOVED?: string;
    AVATAR_CHANGED?: string;
    USERNAME_CHANGED?: string;
    DISCRIMINATOR_CHANGED?: string;
    BOOSTING_STARTED?: string;
    BOOSTING_STOPPED?: string;
}
export interface IGUILD_CREATE {
    RECONNECTED: string;
    NEW_GUILD: string;
}
export interface IGUILD_INTEGRATIONS_UPDATE {
    INTEGRATIONS_UPDATED: string;
}
export interface IGUILD_EMOJIS_UPDATE {
    EDITED_EMOJIS: string;
    ADDED_EMOJIS: string;
    REMOVED_EMOJIS: string;
}
export interface IGUILD_UPDATE {
    NAME_CHANGED: string;
    REGION_CHANGED: string;
    DESCRIPTION_CHANGED: string;
    DMN_CHANGED: string;
    EXPLICIT_FILTER_CHANGED: string;
    VERIFICATION_LEVEL_CHANGED: string;
    BANNER_ADDED: string;
    BANNER_REMOVED: string;
    BANNER_CHANGED: string;
    ICON_ADDED: string;
    ICON_REMOVED: string;
    ICON_CHANGED: string;
    PRESENCES_CHANGED?: string;
    MFA_LEVEL_CHANGED: string;
    OWNER_CHANGED: string;
    AFKCHANNEL_ADDED: string;
    AFKCHANNEL_REMOVED: string;
    AFKCHANNEL_CHANGED: string;
    AFKTIMEOUT_CHANGED: string;
    BOOST_TIER_CHANGED?: string;
    BOOST_SUBSCRIPTIONS_CHANGED?: string;
    PREFERRED_LOCALE_CHANGED: string;
    SPLASH_ADDED: string;
    SPLASH_REMOVED: string;
    SPLASH_CHANGED: string;
    SYSTEM_CHANNEL_ADDED: string;
    SYSTEM_CHANNEL_REMOVED: string;
    SYSTEM_CHANNEL_CHANGED: string;
    VANITY_URL_ADDED: string;
    VANITY_URL_REMOVED: string;
    VANITY_URL_CHANGED: string;
    WIDGET_CHANGED: string;
    WIDGET_CHANNEL_ADDED: string;
    WIDGET_CHANNEL_REMOVED: string;
    WIDGET_CHANNEL_CHANGED: string;
    FEATURES_REMOVED?: string;
    FEATURES_CHANGED?: string;
    FEATURES_ADDED?: string;
}
export interface IGUILD_ROLE_CREATE {
    NEW_ROLE: string;
}
export interface IGUILD_ROLE_UPDATE {
    NAME_CHANGED: string;
    COLOR_CHANGED: string;
    HOIST_CHANGED: string;
    MENTIONABLE_CHANGED: string;
    POSITION_CHANGED: string;
    MANAGED_CHANGED: string;
    PERMS_ADDED: string;
    PERMS_REMOVED: string;
    PERMS_CHANGED: string;
}
export interface IGUILD_ROLE_DELETE {
    REMOVED_ROLE: string;
}
export interface IMESSAGE_UPDATE {
    MESSAGE_CONTENT_UPDATED_GUILD: string;
    MESSAGE_CONTENT_UPDATED_DM: string;
}
export interface IMESSAGE_DELETE {
    MESSAGE_DELETED_DM?: string;
    MESSAGE_DELETED_GUILD: string;
    MESSAGE_DELETED_GUILD_WEBHOOK?: string;
    MESSAGE_DELETED_DM_NO_CACHE?: string;
    MESSAGE_DELETED_GUILD_NO_CACHE?: string;
}
export interface IMESSAGE_DELETE_BULK {
    MESSAGES_DELETED: string;
}
export interface IMESSAGE_REACTION_ADD {
    ADD_REACTION: string;
}
export interface IMESSAGE_REACTION_REMOVE {
    REMOVED_REACTION: string;
}
export interface IMESSAGE_REACTION_REMOVE_ALL {
    REMOVED_ALL_REACTIONS: string;
}
export interface IUSER_UPDATE {
    USER_UPDATED: string;
}
export interface IVOICE_STATE_UPDATE {
    SERVER_DEAFENED: string;
    SERVER_UNDEAFENED: string;
    SERVER_MUTED: string;
    SERVER_UNMUTED: string;
    SELF_DEAFENED?: string;
    SELF_UNDEAFENED?: string;
    SELF_MUTED?: string;
    SELF_UNMUTED?: string;
    START_STREAM?: string;
    STOP_STREAM?: string;
    ENTERED_CHANNEL?: string;
    LEFT_CHANNEL: string;
    MOVED_CHANNEL: string;
}
export interface IVOICE_SERVER_UPDATE {
    CONNECTED: string;
}
export interface ITYPING_START {
    START_TYPING_GUILD: string;
    START_TYPING_DM: string;
}
export interface IWEBHOOKS_UPDATE {
    WEBHOOK_UPDATED: string;
}
export interface IL_messages_logs {
    CHANNEL_CREATE: ICHANNEL_CREATE;
    CHANNEL_UPDATE: ICHANNEL_UPDATE;
    CHANNEL_DELETE: ICHANNEL_DELETE;
    CHANNEL_PINS_UPDATE: ICHANNEL_PINS_UPDATE;
    GUILD_MEMBER_ADD: IGUILD_MEMBER_ADD;
    GUILD_MEMBER_REMOVE: IGUILD_MEMBER_REMOVE;
    GUILD_BAN_ADD: IGUILD_BAN_ADD;
    GUILD_BAN_REMOVE: IGUILD_BAN_REMOVE;
    GUILD_MEMBER_UPDATE: IGUILD_MEMBER_UPDATE;
    GUILD_EMOJIS_UPDATE: IGUILD_EMOJIS_UPDATE;
    GUILD_UPDATE: IGUILD_UPDATE;
    GUILD_ROLE_CREATE: IGUILD_ROLE_CREATE;
    GUILD_ROLE_UPDATE: IGUILD_ROLE_UPDATE;
    GUILD_ROLE_DELETE: IGUILD_ROLE_DELETE;
    MESSAGE_DELETE: IMESSAGE_DELETE;
    MESSAGE_DELETE_BULK: IMESSAGE_DELETE_BULK;
    VOICE_STATE_UPDATE: IVOICE_STATE_UPDATE;
}
export interface ITags {
    footer: string;
    tag: string;
    cant_edit_others: string;
    tag_not_found: string;
    show: IShow;
    set: ISet;
    'delete': {
        deleted_tag: string;
    };
    info: IInfo;
    clearall: IClearall;
    list: IList;
}
export interface IShow {
    no_tag_found: string;
}
export interface ISet {
    name_length: string;
    invalid_name: string;
    content_length: string;
    edited_tag: string;
    saved_tag: string;
}
export interface IInfo {
    by?: string;
    uses?: string;
    created?: string;
    user_not_found?: string;
    user?: string;
    bot?: string;
    profile?: string;
    custom_status?: string;
    status?: string;
    online?: string;
    idle?: string;
    busy?: string;
    offline?: string;
    discord_badges?: string;
    discord_staff?: string;
    discord_partner?: string;
    hypesquad?: string;
    bug_hunter?: string;
    hs_bravery?: string;
    hs_brilliance?: string;
    hs_balance?: string;
    early_supporter?: string;
    team_user?: string;
    system?: string;
    golden_bug_hunter?: string;
    verified_bot?: string;
    early_bot_dev?: string;
    pyboat_badges?: string;
    member_info?: string;
    joined?: string;
    nickname?: string;
    boosting_since?: string;
    roles?: string;
    key_roles?: string;
    infractions?: string;
    infractions_applied?: string;
    infractions_received?: string;
    permissions?: string;
    staff?: string;
    bot_level?: string;
}
export interface IClearall {
    cleared_tags: string;
}
export interface IList {
    no_tags: string;
    tag_list: string;
}
export interface IUtilities {
    time_improper: string;
    reminders: IReminders;
    curs: ICurs;
    snipe: ISnipe;
    random: IRandom;
    snowflake: string;
    avatar: IAvatar;
    server: IServer;
    info: IInfo;
}
export interface IReminders {
    remind_message: string;
    reminder_time_limit: string;
    reminder_count_limit: string;
    reminder_content_limit: string;
    will_remind_in: string;
    no_reminders: string;
    cleared_reminders: string;
}
export interface ICurs {
    not_enabled: string;
    dont_have_role: string;
    check_role: string;
    check_role_slash: string;
    character_limit: string;
    role_not_found: string;
    changed_role_name: string;
    changed_role_color: string;
    color_wrong_format: string;
    already_has_role: string;
    has_no_role: string;
    cleared_role: string;
    deleted_role: string;
    already_assigned_to: string;
    set_role: string;
}
export interface ISnipe {
    no_message: string;
    user_not_found: string;
    requested_by: string;
    said: string;
}
export interface IRandom {
    coin: string;
    coin_tails: string;
    coin_heads: string;
    number_minimum_wrong: string;
    number: string;
}
export interface IAvatar {
    avatar_of: string;
    requested_by: string;
}
export interface IServer {
    guild_not_found: string;
    bot_user_not_found: string;
    preferred_locale: string;
    boosts: string;
    boost_tier: string;
    system_channel: string;
    vanity_url: string;
    description: string;
    widget_no_channel: string;
    widget: string;
    none: string;
    information: string;
    id: string;
    created: string;
    owner: string;
    vc_region: string;
    features: string;
    channels: string;
    other_counts: string;
    roles: string;
    emojis: string;
    bans: string;
    invites: string;
    members: string;
}
export interface IStarboard {
    s_terms: IS_terms;
    stars_block: IStars_block;
    stars_unblock: IStars_unblock;
    stars_lock: IStars_lock;
    stars_unlock: IStars_unlock;
    stars_stats: IStars_stats;
}
export interface IS_terms {
    user: string;
    message: string;
    jump_msg: string;
    message_deleted: string;
    stars: string;
    leaderboard: string;
    ranks: string;
    received: string;
    given: string;
    starred_posts: string;
}
export interface IStars_block {
    already_blocked: string;
    blocked: string;
}
export interface IStars_unblock {
    not_blocked: string;
    unblocked: string;
}
export interface IStars_lock {
    already_locked: string;
    locked: string;
}
export interface IStars_unlock {
    not_locked: string;
    unlocked: string;
}
export interface IStars_stats {
    no_stats: string;
}
export interface ITranslation {
    tr_terms: ITr_terms;
}
export interface ITr_terms {
    requested_by: string;
    jump_message: string;
    cant_translate: string;
    pirate_api: IPirate_api;
}
export interface IPirate_api {
    only_english: string;
    random_fail: string;
    lol_shit_api: string;
}
export interface IReddit {
    red_terms: IRed_terms;
}
export interface IRed_terms {
    posted_by: string;
    upvotes: string;
    downvotes: string;
    comments: string;
}
export interface ICommands {
    must_be_server_owner: string;
    must_be_level: string;
    must_have_roles: string;
    must_not_have_roles: string;
    must_be_on_channel: string;
    must_not_be_on_channel: string;
    command_disabled: string;
    cant_use_command_title: string;
    cant_use_command_description: string;
    must_meet_criteria: string;
    error_executing_command: string;
    error_logged: string;
    arguments_string: string;
    argument_error: string;
    other_error: string;
    unknown_subcommand: string;
    cmd_general: ICmd_general;
}
export interface ICmd_general {
    help: string;
    mylevel: string;
    mylevel_admin: string;
    ping: string;
    cmd_nickme: ICmd_nickme;
}
export interface ICmd_nickme {
    no_permission: string;
    already_nickname: string;
    done: string;
}
export interface ICensor {
    capitals_followed: string;
    characters: string;
    newlines: string;
    illegal_ascii: string;
    action_reason: string;
    too_many_codes: string;
    invite_in_blocklist: string;
    guild_not_allowed: string;
    guild_in_blocklist: string;
    invite_not_allowed: string;
    domain_in_blocklist: string;
    domain_not_allowed: string;
    zalgo_found: string;
    blocked_words: string;
    blocked_tokens: string;
    too_many_caps: string;
    illegal_chars: string;
    censored_name: string;
}
export interface ICounting {
    reset: string;
    set: string;
}
export interface IAntispam {
    action_reason: string;
    raid_channel_msg: string;
}
