/* eslint-disable no-undef */
/* eslint-disable strict */
/* eslint-disable no-console */
/* eslint-disable guard-for-in */

const schema = {
  title: 'PyBoat config',
  type: 'object',
  properties: {
    levels: {
      title: 'Levels',
      type: 'object',
      properties: {
        roles: {
          type: 'array',
          format: 'table',
          uniqueItems: 'true',
          items: {
            type: 'object',
            title: 'Roles',
            properties: {
              id: {
                title: 'Role ID',
                type: 'string',
                default: 'Role ID',
                minLength: '16',
                maxLength: '20',
                pattern: '^[0-9]+$',
              },
              level: {
                title: 'Bot Level',
                type: 'integer',
                minimum: 0,
                maximum: 999,
                default: 10,
              },
            },
          },
        },
        users: {
          type: 'array',
          format: 'table',
          uniqueItems: 'true',
          items: {
            type: 'object',
            title: 'Users',
            properties: {
              id: {
                title: 'User ID',
                type: 'string',
                default: 'User ID',
                minLength: '16',
                maxLength: '20',
                pattern: '^[0-9]+$',
              },
              level: {
                title: 'Bot Level',
                type: 'integer',
                minimum: -1,
                maximum: 999,
                default: 10,
              },
            },
          },
        },
      },
    },
  },
};

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
      dt.levels = Object.fromEntries(dt.levels.roles);
    } else if (typeof dt.levels.roles === 'object' && dt.levels.roles !== null && !compose) {
      dt.levels.roles = toArray(dt.levels.roles);
    }
  }
  return dt;
}

let editor;
function submit() {
  const data = {};
  data.levels = editor.getEditor('root.levels').getValue();
  console.log('before', data);
  console.log('after', parseData(data));
}

/* fetch('./schema.json')
  .then((response) => response.json())
  .then((obj) => { */
const defaultOptions = {
  iconlib: 'spectre',
  object_layout: 'table',
  show_errors: 'always',
  schema,
  theme: 'bootstrap4',
  disable_properties: true,
  disable_edit_json: false,
  disable_array_reorder: true,
  disable_array_delete_last_row: true,
  disable_array_delete_all_rows: true,
  prompt_before_delete: false,
};

const element = document.getElementById('editor_holder');
editor = new JSONEditor(element, defaultOptions);

document.getElementById('submit').addEventListener('click', () => {
  // Get the value from the editor
  submit();
});

editor.on('ready', () => {
  // Now the api methods will be available
  editor.validate();
  console.log('ready');
});
// });
