const electron = require('electron')
const Store = require('electron-store');

const app = electron.app
const store = new Store();
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')
const serialport = require('serialport')
const macro = require('./macro.js');

let sp = null; // serial port instance
let context = {}; // environment context
let timer = null; // timer
let exec_event = null; // event for exec
let macro_store = {};
let view_settings = {};
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow() {
    macro_store = store.get('macro_store') || {};
    view_settings = store.get('view_settings') || {
        "movement":"15",
        "g_wait_ms":"1500"
    };
    // Create the browser window.
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 600,
        backgroundColor: "#ccc",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // workaround to allow use with Electron 12+
            preload: path.join(__dirname, 'preload.js')
        }
    })

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // Open the DevTools.
    // mainWindow.webContents.openDevTools()

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null
    })

    mainWindow.setMenu(null);
}

function sync_store() {
    store.set('macro_store', macro_store);
    store.set('view_settings', view_settings);
}

// This is required to be set to false beginning in Electron v9 otherwise
// the SerialPort module can not be loaded in Renderer processes like we are doing
// in this example. The linked Github issues says this will be deprecated starting in v10,
// however it appears to still be changed and working in v11.2.0
// Relevant discussion: https://github.com/electron/electron/issues/18397
app.allowRendererProcessReuse=false

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    app.quit()
})

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.


electron.ipcMain.on('list_serial_ports', (event)=>{
    serialport.list().then((ports, error) => {
        event.sender.send('list_serial_ports_complete', {ports: ports, error: error});
    });
});

electron.ipcMain.on('connect_serial', (event, port_no)=>{
    sp = new serialport(port_no,{ baudRate: 115200,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        flowControl: false
    });
    // 開始
    sp.on('open', function() {
        event.sender.send('connect_serial_open');
    });
    // エラー
    sp.on('error', function(e) {
        event.sender.send('connect_serial_error', e.message);
    });
    /* // 受信
    sp.on('data', function(data) {
        event.sender.send('connect_serial_data', data);
    });
    */
});

electron.ipcMain.on('set_context', (event, _context)=>{
    context = _context;
    macro.set_context(_context);
});

electron.ipcMain.on('serial_write', (event, message)=>{
    serial_write(message);
});

electron.ipcMain.handle('macro_store_list', (event) => {
    var res = {};
    for (var kg of Object.keys(macro_store)) {
        for (var km of Object.keys(macro_store[kg])) {
            if (!res[kg]) res[kg] = [];
            res[kg].push(km);
        }
    }
    return res;
});

electron.ipcMain.on('macro_store_regist', (event, group_name, macro_name, macro_data) => {
    if (!macro_store[group_name]) macro_store[group_name] = {};
    macro_store[group_name][macro_name] = macro_data; 
    sync_store();
});

electron.ipcMain.handle('macro_store_detail', (event, group_name, macro_name) => {
    return macro_store[group_name][macro_name];
});

electron.ipcMain.on('macro_store_swap_before', (event, group_name, src, tgt) => {

    var res = {};
    var macros = macro_store[group_name];
    var sd = macros[src];
    
    for (var km of Object.keys(macros)) {
        if (km == src) continue;
        if (km == tgt) {
            res[src] = sd;
        }
        res[km] = macros[km];
    }

    macro_store[group_name] = res;

    sync_store();
});

electron.ipcMain.on('macro_store_remove_macro', (event, group_name, macro_name) => {
    delete macro_store[group_name][macro_name];
    sync_store();
});

electron.ipcMain.on('macro_store_remove_group', (event, group_name) => {
    delete macro_store[group_name];
    sync_store();
});

electron.ipcMain.handle('view_settings_read', (event) => {
    return view_settings;
});

electron.ipcMain.on('view_settings_sync', (event, settings) => {
    view_settings = settings;
    sync_store();
});

function serial_write(message) {
    sp.write(message);
}

electron.ipcMain.on('exec_macro', (event, text)=>{
    exec_event = event;
    exec_macro(text);
});

electron.ipcMain.on('exec_cancel', (event)=>{
    if (timer) {
        clearTimeout(timer);
        exec_macro_complete();
    }
});

function exec_macro_complete() {
    if (exec_event) {
        exec_event.sender.send('exec_macro_complete');
    }
}

function exec_macro(text) {
    exec_macro_per_row(text.split("\n"));
}
  
function exec_macro_per_row(a_mc,idx) {
    if (!idx) idx = 0;
    exec_macro_line(a_mc[idx]);
    idx++;

    var wait = context['g_wait_ms'];
    if (a_mc[idx] && macro.commands.wait.check(a_mc[idx])) {
        wait = macro.commands.wait.parse(a_mc[idx]).second * 1000;
    }

    if (timer) clearTimeout(timer);

    if (a_mc[idx]) {
        timer = setTimeout(function(){ exec_macro_per_row(a_mc, idx); }, wait);
    } else if (context['is_loop']) {
        idx = 0;
        timer = setTimeout(function(){ exec_macro_per_row(a_mc, idx); }, wait);
    } else {
        exec_macro_complete();
    }
}

function exec_macro_line(text) {
    for(var key of Object.keys(macro.commands)) {
        var mc = macro.commands[key];
        if (!text || !mc.check(text)) continue;
        var cm = mc.control(text);
        if (cm) serial_write(cm+"\n");
    }
}
