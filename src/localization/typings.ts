/*

		THIS FILE IS AUTO-GENERATED, DO NOT EDIT IT MANUALLY!

*/

export interface IRootObject {
    core: ICore;
    commands: ICommands;
}
export interface ICore {
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
