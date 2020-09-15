/* eslint-disable no-undef */
/* eslint-disable strict */
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
      // dt.levels = Object.fromEntries(dt.levels.roles);
    } else if (typeof dt.levels.roles === 'object' && dt.levels.roles !== null && !compose) {
      dt.levels.roles = toArray(dt.levels.roles);
    }
  }
  return dt;
}

let editor;
function submit() {
  editor.validate();
  let data = { levels: editor.getEditor('root.levels').getValue() };
  console.log('data', data);
  console.log('before', data, typeof data.levels);
  data = parseData(data, true);
  console.log('after', data);
}

function copyJson() {
  const copyText = document.getElementById('json_output');

  /* Select the text field */
  copyText.select();
  copyText.setSelectionRange(0, 999999); /* For mobile devices */

  /* Copy the text inside the text field */
  document.execCommand('copy');
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
      disable_edit_json: true,
      disable_array_reorder: true,
      disable_array_delete_last_row: true,
      disable_array_delete_all_rows: true,
      prompt_before_delete: false,
    };

    const element = document.getElementById('editor_holder');
    editor = new JSONEditor(element, defaultOptions);

    /* document.getElementById('submit').addEventListener('click', () => {
  // Get the value from the editor
  submit();
}); */
    editor.on('change', () => {
      const vali = editor.validate();
      if (vali.length) {
        document.getElementById('button_copy').style = 'background-color:red';
        document.getElementById('button_copy').disabled = true;
        document.getElementById('button_copy').text = '';
        document.getElementById('json_output').value = 'JSON Error';
      } else {
        document.getElementById('button_copy').style = 'background-color:green';
        document.getElementById('button_copy').disabled = false;
        document.getElementById('button_copy').text = 'Copy to clipboard';
        document.getElementById('json_output').value = JSON.stringify(editor.getValue(), null, 2);
      }
    });
    editor.on('ready', () => {
      // Now the api methods will be available
      // editor.validate();
      console.log('ready');
    });
  });
