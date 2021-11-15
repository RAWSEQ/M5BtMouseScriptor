const serialport = require('serialport')
const macro = require('./macro.js');
const { ipcRenderer } = require('electron')

var sp = null;
var is_busy = false;
var rel_x = 0;
var rel_y = 0;
var context = {};
var is_execute = false;
var drag_from = '';
var macro_list = {};

async function listSerialPorts() {
  ipcRenderer.send('list_serial_ports');
}

window.onload = function(){
  view_settings_read();
  macro_store_list_read();
};

async function view_settings_read() {
  const set = await ipcRenderer.invoke('view_settings_read');
  document.getElementById('movement').value = set.movement;
  document.getElementById('g_wait_ms').value = set.g_wait_ms;
}

ipcRenderer.on('list_serial_ports_complete', (event, result) => {
  if(result.error) {
    document.getElementById('error').textContent = result.error.message;
    return
  } else {
    document.getElementById('error').textContent = ''
  }

  if (result.ports.length === 0) {
    document.getElementById('error').textContent = 'No ports discovered'
  }

  tableHTML = '';

  for (let pt of result.ports) {
    tableHTML += '<div class="port-row"><button class="btn btn-primary" onclick="connectSerial(\''+pt.path+'\')">'+pt.path+'</button> '+pt.pnpId+'</div>';
  }

  document.getElementById('ports').innerHTML = tableHTML;
});

setTimeout(function listPorts() {
  listSerialPorts();
  setTimeout(listPorts, 2000);
}, 2000);

function connectSerial(port_no) {
  ipcRenderer.send('connect_serial', port_no);
}
ipcRenderer.on('connect_serial_open', (event) => {
  document.querySelector('.tab-program-macro').classList.remove('disabled');
  document.querySelector('.tab-exec-macro').classList.remove('disabled');
  document.querySelector('.select-port').style.display = 'none';
  changeTab('program-macro');
  sync_context();
});
ipcRenderer.on('connect_serial_error', (event, err_mes) => {
  document.getElementById('error').textContent = err_mes;
});

ipcRenderer.on('exec_macro_complete', (event, message) => {
  set_view_exec_mode(false);
});

function serial_write(message) {
  ipcRenderer.send('serial_write', message);
}

function sync_context(overrides) {
  context['g_wait_ms'] = document.getElementById('g_wait_ms').value;
  context['movement'] = document.getElementById('movement').value;
  context['is_loop'] = document.getElementById('is_loop').checked;
  if (overrides) {
    $.extend(context, overrides);
  }
  ipcRenderer.send('set_context', context);
}

function changeTab(name) {
  document.querySelector('.area-connect').classList.remove('active');
  document.querySelector('.area-program-macro').classList.remove('active');
  document.querySelector('.area-exec-macro').classList.remove('active');
  document.querySelector('.tab-connect').classList.remove('active');
  document.querySelector('.tab-program-macro').classList.remove('active');
  document.querySelector('.tab-exec-macro').classList.remove('active');

  document.querySelector('.area-'+name).classList.add('active');
  document.querySelector('.tab-'+name).classList.add('active');
}

function monitor() {
  document.getElementById('monitor').innerHTML = rel_x+","+rel_y;
}

function append_program_macro(text) {
  const chk_val = document.getElementById('program_macro').value;
  if (chk_val && !String(chk_val).endsWith("\n")) {
    document.getElementById('program_macro').value += "\n";
  }
  document.getElementById('program_macro').value += text+"\n";
}

function m_reset() {
  if (is_busy) return;
  exec_macro(macro.commands.reset.serialize());
  rel_x = 0;
  rel_y = 0;
  monitor();
  append_program_macro(macro.commands.reset.serialize());
  is_busy = true; setTimeout(function(){ is_busy = false; },100);
}

function m_wait() {
  append_program_macro(macro.commands.wait.serialize(document.getElementById('m_wait_second').value));
}

function m_move(x,y) {
  if (is_busy) return;
  exec_macro(macro.commands.move.serialize(x,y));
  rel_x += x;
  rel_y += y;
  monitor();
  is_busy = true; setTimeout(function(){ is_busy = false; },100);
}
function m_up() { m_move(0,-1); }
function m_down() { m_move(0,1); }
function m_left() { m_move(-1,0); }
function m_right() { m_move(1,0); }
document.addEventListener('keydown',(e) => {
  if (is_execute) return;
  if (e.target.classList.contains("form-control")) return;
  if (e.target.id =="program_macro") return;
  if (e.target.id =="macro") return;
  if (e.code == 'KeyW') {
    m_up();
    e.preventDefault();
  } else if (e.code == 'KeyS') {
    m_down();
    e.preventDefault();
  } else if (e.code == 'KeyA') {
    m_left();
    e.preventDefault();
  } else if (e.code == 'KeyD') {
    m_right();
    e.preventDefault();
  }
});
function m_comp_base(cmd) {
  append_program_macro(macro.commands[cmd].serialize(rel_x,rel_y));
  rel_x = 0;
  rel_y = 0;
  monitor();
}
function m_comp() {m_comp_base('move');};
function m_comp_click() {m_comp_base('move_click_left');exec_macro(macro.commands.single_click_left.serialize());};
function m_comp_press() {m_comp_base('move_press_left');exec_macro(macro.commands.single_press_left.serialize());};
function m_comp_release() {m_comp_base('move_release_left');exec_macro(macro.commands.single_release_left.serialize());};

function m_scr() {
  if (is_busy) return;
  exec_macro(macro.commands.single_click_right.serialize());
  append_program_macro(macro.commands.single_click_right.serialize());
  is_busy = true; setTimeout(function(){ is_busy = false; },100);
}

function m_scm() {
  if (is_busy) return;
  exec_macro(macro.commands.single_click_middle.serialize());
  append_program_macro(macro.commands.single_click_middle.serialize());
  is_busy = true; setTimeout(function(){ is_busy = false; },100);
}

function program_exec() {
  set_view_exec_mode(true);
  sync_context();
  exec_macro(document.getElementById('program_macro').value);
}

function program_exec_line() {
  var pl = "";
  var se = $("#program_macro").get(0).selectionEnd;
  for(var line of $("#program_macro").val().split("\n")){
    se -= line.length+1;
    if (se < 0) { pl = line; break; }
  }
  sync_context({is_loop:false});
  exec_macro(pl);
}

function exec_macro(text) {
  ipcRenderer.send('exec_macro', text);
}

function exec_cancel() {
  ipcRenderer.send('exec_cancel');
}

function set_view_exec_mode(is_exec) {
  if (is_exec) {
    is_execute = true;
    document.getElementById('exec_status').textContent = "マクロ実行中";
    document.querySelector('nav.main-header').classList.add('in_exec');
    for (let d_inst of document.querySelectorAll('.cmd-instance')) {
      d_inst.setAttribute('disabled', true);
    }
    document.getElementById('program_exec').style.display = 'none'
    document.getElementById('exec_cancel').style.display = 'block';
    $('.exec_c').show();
  } else {
    is_execute = false;
    document.getElementById('exec_status').textContent = "";
    document.querySelector('nav.main-header').classList.remove('in_exec');
    for (let d_inst of document.querySelectorAll('.cmd-instance')) {
      d_inst.removeAttribute('disabled');
    }
    document.getElementById('program_exec').style.display = 'block';
    document.getElementById('exec_cancel').style.display = 'none'
    $('.exec_c').hide();
  }
}

async function macro_store_list_read() {
  macro_list = await ipcRenderer.invoke('macro_store_list');

  $('#macro-group-list').html('');
  $('#macro_group').html('');
  $('#macro-name-list').html('');
  $('#m-name').html('');

  for (var kg of Object.keys(macro_list)) {
    $('#macro-group-list').append('<option value="'+kg+'">'+kg+'</option>');
    $('#m-group').append('<option value="'+kg+'">');
  }

  if (Object.keys(macro_list).length) {
    for (var km of macro_list[Object.keys(macro_list)[0]]) {
      $('#macro-name-list').append('<div class="col-md-3 macro-piece"><button draggable="true" class="btn btn-block btn-primary">'+km+'</button></div>');
    } 
  }
}

function macro_store_select_group() {
  group_name = document.getElementById('macro-group-list').value;
  $('#macro-name-list').html('');
  if (macro_list[group_name]) {
    for (var km of macro_list[group_name]) {
      $('#macro-name-list').append('<div class="col-md-3 macro-piece"><button draggable="true" class="btn btn-block btn-primary">'+km+'</button></div>');
    }
  }
}

function macro_store_select_group_combo() {
  group_name = document.getElementById('macro_group').value;
  $('#m-name').html('');
  $('#macro_name').val('');
  if (macro_list[group_name]) {
    for (var km of macro_list[group_name]) {
      $('#m-name').append('<option value="'+km+'">');
    }
  }
}

function macro_store_regist() {
  macro_group = document.getElementById('macro_group').value;
  macro_name = document.getElementById('macro_name').value;

  if (!macro_group) {
    $('.error.macro_group').text('入力してください');
    return;
  }
  if (!macro_name) {
    $('.error.macro_name').text('入力してください');
    return;
  }
  if (macro_list[macro_group] && macro_list[macro_group].includes(macro_name)) {
    $('#macro-store-regist').addClass('mode-overwrite');
    return;
  }

  macro_store_regist_proc(macro_group,macro_name);
  $('#macro-store-regist').modal('hide');
}

function macro_store_regist_ovw() {
  macro_group = document.getElementById('macro_group').value;
  macro_name = document.getElementById('macro_name').value;
  macro_store_regist_proc(macro_group,macro_name);
  $('#macro-store-regist').modal('hide');
}

function macro_store_regist_proc(group,name) {
  var info = {
    program_macro: document.getElementById('program_macro').value,
    is_loop: document.getElementById('is_loop').checked,
    g_wait_ms: document.getElementById('g_wait_ms').value,
  };
  ipcRenderer.send('macro_store_regist',group,name,info);
  document.getElementById('macro_group').value = '';
  document.getElementById('macro_name').value = '';
  $('#m-name').html('');
  macro_store_macro_reload();
  splash('登録しました。');
}

async function exec_macro_store(macro_group,macro_name) {
  const info = await ipcRenderer.invoke('macro_store_detail',macro_group,macro_name);
  document.getElementById('program_macro').value = info.program_macro;
  document.getElementById('is_loop').checked = info.is_loop;
  document.getElementById('g_wait_ms').value = info.g_wait_ms;
  program_exec();
}

async function edit_macro_store(macro_group,macro_name) {
  const info = await ipcRenderer.invoke('macro_store_detail',macro_group,macro_name);
  document.getElementById('program_macro').value = info.program_macro;
  document.getElementById('is_loop').checked = info.is_loop;
  document.getElementById('g_wait_ms').value = info.g_wait_ms;
  changeTab('program-macro');
  document.getElementById('macro_group').value = macro_group;
  document.getElementById('macro_name').value = macro_name;
}

function remove_macro_group() {
  var name = $('#macro-group-list').val();
  if (!name) return;
  ipcRenderer.send('macro_store_remove_group', name);
  macro_store_list_read();
}

async function macro_store_macro_reload() {
  macro_list = await ipcRenderer.invoke('macro_store_list');
  var mlist = macro_list[$('#macro_group').val()];
  if (mlist) {
    $('#m-name').html('');
    for (var km of mlist) {
      $('#m-name').append('<option value="'+km+'">');
    }
  }

  var mnlist = macro_list[$('#macro-group-list').val()];
  if (mnlist) {
    $('#macro-name-list').html('');
    for (var km of mnlist) {
      $('#macro-name-list').append('<div class="col-md-3 macro-piece"><button draggable="true" class="btn btn-block btn-primary">'+km+'</button></div>');
    }
  }

  var tmp_macro_group = $('#macro-group-list').val();
  $('#macro-group-list').html('');
  $('#m-group').html('');

  for (var kg of Object.keys(macro_list)) {
    $('#macro-group-list').append('<option value="'+kg+'">'+kg+'</option>');
    $('#m-group').append('<option value="'+kg+'">');
  }

  $('#macro-group-list').val([tmp_macro_group]);
}

function macro_store_swap_before(group,from,to) {
  if (!group) return;
  if (from == to) return;
  ipcRenderer.send('macro_store_swap_before',group,from,to);
  macro_store_macro_reload();
}

function macro_store_remove_macro(group,macro_name) {
  if (!group) return;
  if (!macro_name) return;
  ipcRenderer.send('macro_store_remove_macro',group,macro_name);
  macro_store_macro_reload();
}

// splash https://qiita.com/RAWSEQ/items/fec6cef0cab3e50fa07d
function splash(s,t){var a,i,n={message_class:"splashmsg default",fadein_sec:.1,wait_sec:.5,fadeout_sec:1.5,opacity:.9,trans_in:"ease-in",trans_out:"ease-out",outer_style:"top: 0px;left: 0px;position: fixed;z-index: 1000;width: 100%;height: 100%;",message_style:"padding:0.5em;font-size:4em;color:white;background-color:gray; position: absolute;top: 50%; left: 50%;transform: translateY(-50%) translateX(-50%);-webkit-transform: translateY(-50%) translateX(-50%);",style_id:"append_splash_msg_style",outer_id:"append_splash_msg",message_id:"append_splash_msg_inner",on_splash_vanished:null};for(a in t)t.hasOwnProperty(a)&&(n[a]=t[a]);document.getElementById(n.style_id)||((i=document.createElement("style")).id=n.style_id,i.innerHTML="#"+n.outer_id+" { "+n.outer_style+" } #"+n.outer_id+" > #"+n.message_id+" {opacity: 0;transition: opacity "+n.fadeout_sec+"s "+n.trans_out+";-webkit-transition: opacity "+n.fadeout_sec+"s "+n.trans_out+";} #"+n.outer_id+".show > #"+n.message_id+" {opacity: "+n.opacity+";transition: opacity "+n.fadein_sec+"s "+n.trans_in+";-webkit-transition: opacity "+n.fadein_sec+"s "+n.trans_in+";}#"+n.message_id+" { "+n.message_style+" } ",document.body.appendChild(i)),(e=document.getElementById(n.outer_id))&&(e.parentNode.removeChild(e),n.on_splash_vanished&&n.on_splash_vanished());var o=document.createElement("div");o.id=n.outer_id,o.onclick=function(){(e=document.getElementById(n.outer_id))&&e.parentNode.removeChild(e),n.on_splash_vanished&&n.on_splash_vanished()},o.innerHTML='<div id="'+n.message_id+'" class="'+n.message_class+'">'+s+"</div>",document.body.appendChild(o),setTimeout(function(){o&&o.classList.add("show")},0),setTimeout(function(){o&&o.classList.remove("show")},1e3*n.wait_sec),setTimeout(function(){o&&o.parentNode&&o.parentNode.removeChild(o),n.on_splash_vanished&&n.on_splash_vanished()},1e3*(n.fadeout_sec+n.wait_sec))}