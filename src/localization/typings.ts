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
    system: string;
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
    antiping: IAntiping;
    admin: IAdmin;
    infractions: IInfractions;
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
    snowflake_wrong: string;
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
    invalid_regex: string;
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
export interface IAntiping {
    repeated_mute_reason: string;
    displayed_mute_reason: string;
    normal_mute_reason: string;
    unmute_ignore: string;
    unmute_ignore_once: string;
    kick_reason: string;
    softban_reason: string;
    ban_reason: string;
    auto_ban_left_reason: string;
}
export interface IAdmin {
    slowmode_expired: string;
    channel_lock_expired: string;
    guild_lock_expired: string;
    no_target_bot: string;
    bot_cant_manage_messages: string;
    bot_cant_manage_roles: string;
    bot_cant_manage_nicknames: string;
    bot_cant_manage_target: string;
    bot_cant_manage_role: string;
    actor_cant_assign_role_hierarchy: string;
    actor_cant_manage_roles: string;
    actor_cant_manage_nicknames: string;
    actor_cant_view_channel: string;
    actor_cant_manage_messages: string;
    actor_cant_target_self: string;
    actor_cant_target_level: string;
    actor_cant_target_roles: string;
    actor_cant_target_globaladmin: string;
    cant_manage_channel: string;
    invalid_channel: string;
    invalid_duration: string;
    for_time: string;
    reason: string;
    unknown_role: string;
    role_inexistent: string;
    adm_slowmode: IAdm_slowmode;
    adm_lock_channel: IAdm_lock_channel;
    adm_lock_guild: IAdm_lock_guild;
    already_has_role: string;
    already_doesnt_have_role: string;
    adm_nick: IAdm_nick;
    adm_clean: IAdm_clean;
    adm_inv_prune: IAdm_inv_prune;
    no_locked_roles: string;
    could_not_find_role: string;
    adm_role_unlock: IAdm_role_unlock;
    adm_role_add: IAdm_role_add;
    adm_role_remove: IAdm_role_remove;
    role_spread_in_progress: string;
    adm_role_all: string;
    adm_nuke_all: string;
    group_roles_disabled: string;
    role_incorrectly_configured: string;
    group_already_has_role: string;
    group_doesnt_have_role: string;
    group_has_staff_perms: string;
    group_joined: string;
    group_left: string;
    failed_nickname: string;
    set_nickname: string;
    duration_malformed: string;
    exceeds_duration: string;
    temprole_added: string;
    temprole_failed: string;
    adm_roles_list: IAdm_roles_list;
    adm_actions: IAdm_actions;
    adm_backup: IAdm_backup;
}
export interface IAdm_slowmode {
    channel_already_slowmode: string;
    slowmode_enabled: string;
    slowmode_disabled: string;
    slowmode_cmd: string;
    slowmode_failed: string;
}
export interface IAdm_lock_channel {
    already_locked: string;
    not_locked: string;
    locked: string;
    unlocked: string;
    locked_fail: string;
    locked_cmd: string;
    unlocked_cmd: string;
    unlocked_fail: string;
}
export interface IAdm_lock_guild {
    cant_edit_role: string;
    already_locked: string;
    not_locked: string;
    failed_lock: string;
    locked_cmd: string;
    unlocked_cmd: string;
    failed_unlock: string;
}
export interface IAdm_nick {
    already_has_nick: string;
}
export interface IAdm_clean {
    too_many_msgs: string;
    already_cleaning: string;
    from_user: string;
    in_channel: string;
    failed_clean: string;
    cleaned_messages_user: string;
    no_messages_cleaned: string;
    cleaned_messages_channel: string;
    cleaned_messages_all: string;
    cleaned_messages_bots: string;
}
export interface IAdm_inv_prune {
    no_invites: string;
    pruned: string;
}
export interface IAdm_role_unlock {
    not_locked: string;
    already_unlocked: string;
    unlocked: string;
}
export interface IAdm_role_add {
    failed_add: string;
    added_role: string;
}
export interface IAdm_role_remove {
    failed_remove: string;
    removed_role: string;
}
export interface IAdm_roles_list {
    no_roles: string;
    level_short: string;
    hoisted_short: string;
    mentionable_short: string;
    properties: string;
}
export interface IAdm_actions {
    no_active: string;
    title: string;
    more_actions: string;
}
export interface IAdm_backup {
    restored: string;
    failed_restore: string;
    saved: string;
    failed_save: string;
    user_not_found: string;
    no_data: string;
    none: string;
    data_display: string;
    deleted: string;
}
export interface IInfractions {
    targeting: ITargeting;
    inf_terms: IInf_terms;
}
export interface ITargeting {
    bot_cant_kick: string;
    bot_cant_ban: string;
    bot_cant_manage_roles: string;
    bot_cant_manage_mute_role: string;
    bot_cant_perform_action: string;
    cant_target_bot: string;
    actor_cant_kick: string;
    actor_cant_ban: string;
    actor_cant_roles: string;
    actor_cant_level: string;
    actor_cant_hierarchy: string;
    actor_cant_admin: string;
    cant_self_target: string;
}
export interface IInf_terms {
    exceeds_duration: string;
    mute_undefined: string;
    unknown_mute_role: string;
    already_muted: string;
    not_muted: string;
    already_banned: string;
    not_banned: string;
    failed_kick: string;
    kicked_member: string;
    failed_tempmute: string;
    failed_mute: string;
    muted_member: string;
    temp_muted_member: string;
    failed_unmute: string;
    unmuted_member: string;
    user_not_found: string;
    failed_ban: string;
    banned_user: string;
    massban_ids: string;
    massbanned: string;
    failed_cleanban: string;
    clean_banned_member: string;
    failed_softban: string;
    softbanned_user: string;
    failed_tempban: string;
    tempbanned_user: string;
    failed_unban: string;
    unbanned_user: string;
    no_infractions: string;
    inf_not_found: string;
    inf_recent: string;
    inf_active: string;
    inf_info: string;
    inf_not_active: string;
    cannot_edit_inf: string;
    inf_duration_updated: string;
    inf_reason_updated: string;
    cannot_assign_system: string;
    inf_actor_updated: string;
    inf_deleted: string;
    cant_find_infractions: string;
    infs_deleted: string;
    no_infs_by_actor: string;
    inf_search_actor: string;
    no_infs_by_system: string;
    inf_search_system: string;
    no_infs_to_user: string;
    inf_search_user: string;
    no_infs_type: string;
    infs_search_type: string;
    more_infs: string;
    with_reason: string;
}
