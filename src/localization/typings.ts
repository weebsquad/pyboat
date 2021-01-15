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
    tags: ITags;
    utilities: IUtilities;
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
    by: string;
    uses: string;
    created: string;
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
    dont_have_role: string;
    check_role: string;
    check_role_slash: string;
    character_limit: string;
    role_not_found: string;
    changed_role_name: string;
    changed_role_color: string;
    color_wrong_format: string;
    already_has_role: string;
    already_assigned_to: string;
    set_role: string;
}
