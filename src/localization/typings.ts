/*

		THIS FILE IS AUTO-GENERATED, DO NOT EDIT IT MANUALLY!

*/

export interface IRootObject {
    Time_units: ITime_units;
    Ranks: IRanks;
    Config: IConfig;
    modules: IModules;
}
export interface ITime_units {
    full: IFull;
    'short': {
        year: string;
        month: string;
        week: string;
        day: string;
        hour: string;
        minute: string;
        second: string;
        millisecond: string;
    };
}
export interface IFull {
    year: string;
    month: string;
    week: string;
    day: string;
    hour: string;
    minute: string;
    second: string;
    millisecond: string;
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
}
export interface ITags {
    shared: IShared;
    commands: ICommands;
}
export interface IShared {
    footer: string;
    tag: string;
    cant_edit_others: string;
    tag_not_found: string;
}
export interface ICommands {
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
