'use strict';

/* eslint-disable no-console */
/* eslint-disable guard-for-in */

function toArray(dt) {
  const dtN = [];
  for (const key in dt) {
    const top = {};
    top[key] = dt[key];
    dtN.push(top);
  }
  return dtN;
}

function parseData(dt, compose = true) {
  if (typeof dt.levels === 'object') {
    if (Array.isArray(dt.levels.roles) && compose) {
      console.log('asd');
      dt.levels = Object.fromEntries(dt.levels.roles);
    } else if (typeof dt.levels.roles === 'object' && dt.levels.roles !== null && !compose) {
      dt.levels.roles = toArray(dt.levels.roles);
    }
  }
  return dt;
}

fetch('./schema.json')
  .then((response) => response.json())
  .then((obj) => {
    const defaultOptions = {
      iconlib: 'spectre',
      object_layout: 'table',
      show_errors: 'always',
      schema: obj,
      theme: 'bootstrap4',
      disable_properties: true,
      disable_edit_json: false,
      disable_array_reorder: true,
      disable_array_delete_last_row: true,
      disable_array_delete_all_rows: true,
      prompt_before_delete: false,
    };

    const element = document.getElementById('editor_holder');
    const editor = new JSONEditor(element, defaultOptions);

    document.getElementById('submit').addEventListener('click', () => {
      // Get the value from the editor
      const elements = ['levels', 'guildId', 'modules'];
      const dt = {};
      elements.forEach((val) => {
        const thisDt = editor.getEditor(`root.${val}`);
        if (thisDt !== null && typeof thisDt !== 'undefined') {
          const thisVal = thisDt.getValue();
          console.log(thisVal);
          dt[val] = thisVal;
        }
      });
      console.log('before', dt);
      console.log('after', parseData(dt));
    });

    editor.on('ready', () => {
      // Now the api methods will be available
      editor.validate();
      console.log('ready');
    });
  });
