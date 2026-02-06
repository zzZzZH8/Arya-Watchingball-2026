const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    // 1. 获取屏幕尺寸，计算右下角位置
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    const winWidth = 320;  // 小窗口宽度
    const winHeight = 320; // 小窗口高度

    mainWindow = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        x: width - winWidth - 20, // 距离右边 20px
        y: height - winHeight - 20, // 距离底边 20px
        frame: false,       // 无边框
        transparent: true,  // 背景透明
        hasShadow: false,
        resizable: true,    // 允许缩放
        alwaysOnTop: true,  // 默认置顶 (作为挂件通常需要置顶)
        skipTaskbar: true,  // 不在任务栏显示 (更像挂件)
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('renderer/index_soft.html');

    // 解决透明窗口在某些系统下的渲染闪烁问题
    mainWindow.on('ready-to-show', () => {
        mainWindow.show();
    });
}

// --- 核心：鼠标穿透控制 IPC ---
// 渲染进程会告诉主进程："鼠标现在是否在可点击区域？"
ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
        win.setIgnoreMouseEvents(ignore, options);
    }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
