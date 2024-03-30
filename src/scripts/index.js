//imports.section

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

//variableInitialization.section

let contextSettings = {};
let mainWindow;
let pythonProcess;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1100,
    minHeight: 700,
    maxWidth: 2300,
    maxHeight: 1100,
    icon: path.join(__dirname, '../graphics/BlackStarUI.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    autoHideMenuBar: true, 
    devTools: false, 
    frame: true 
  });

  mainWindow.loadFile(path.join(__dirname, '../content/inference.html'));

  mainWindow.on('close', () => {
    pythonProcess.kill(); 
    app.quit();
  }); 
  pythonProcess = createPythonProcess(mainWindow);
};

//interProcessCommunication.section

ipcMain.on('update-context-settings', (event, newContextSettings) => {
  contextSettings = newContextSettings;
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function createPythonProcess(mainWindow) {
  const pythonProcess = spawn('python', ['-u', 'ForwardPass.py'], {
    cwd: path.join(__dirname, '../scripts'),
  });

  pythonProcess.stdout.on('data', (data) => {
    mainWindow.webContents.send('python-script-response', data.toString());
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  return pythonProcess;
}

ipcMain.on('run-python-script', (event, user_input) => {
  const message = {
    user_input: user_input,
    context_settings: contextSettings,
  };
  pythonProcess.stdin.write(JSON.stringify(message) + '\n');
});

//applicationFunctionality.section

if (require('electron-squirrel-startup')) {
  app.quit();
}

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.exit();
});

function restartPythonProcess() {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  pythonProcess = createPythonProcess(mainWindow);
}

ipcMain.on('restart-python-process', () => {
  restartPythonProcess();
  mainWindow.webContents.send('python-process-restarted');
});

ipcMain.on('save-image', (event, imgName, imgData) => {
  const imgPath = path.join(__dirname, '..', 'graphics', 'pfp', imgName);
  fs.writeFile(imgPath, imgData, 'base64', (err) => {
    if (err) {
      console.error('Error saving image:', err);
    } else {
      console.log('Image saved:', imgPath);
    }
  });
});
