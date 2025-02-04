const { app, BrowserWindow, Tray, Menu, Notification, globalShortcut, dialog, shell } = require("electron");
const path = require("path");

let mainWindow;
let tray = null;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 800,
		icon: path.join(__dirname, "assets", process.platform === "darwin" ? "icon.icns" : "icon.ico"),
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			enableRemoteModule: false,
		},
	});

	mainWindow.loadURL("https://outlook.office.com/mail/");

	// Prevent window from closing, hide it instead
	mainWindow.on("close", (event) => {
		if (!app.isQuitting) {
			event.preventDefault();
			mainWindow.hide();
		}
	});

	// Open external links in the default browser
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (!url.startsWith("https://outlook.office.com")) {
			shell.openExternal(url);
			return { action: "deny" };
		}
		return { action: "allow" };
	});

	mainWindow.webContents.on("will-navigate", (event, url) => {
		if (!url.startsWith("https://outlook.office.com")) {
			event.preventDefault();
			shell.openExternal(url);
		}
	});

	// Check for unread emails and update badge and tray tooltip
	setInterval(() => {
		if (mainWindow && !mainWindow.isDestroyed()) {
			checkUnreadEmails();
		}
	}, 30000);
}

// Function to check unread emails and update dock badge and tray tooltip
function checkUnreadEmails() {
	mainWindow.webContents
		.executeJavaScript(
			`
        (function() {
            const title = document.title;
            const match = title.match(/\$begin:math:text$(\\\\d+)\\$end:math:text$/);
            return match ? parseInt(match[1]) : 0;
        })();
    `
		)
		.then((unreadCount) => {
			if (process.platform === "darwin" && app.dock) {
				app.dock.setBadge(unreadCount > 0 ? unreadCount.toString() : "");
			}
			updateTrayTooltip(unreadCount);

			// Display notification when new emails arrive
			if (unreadCount > 0) {
				new Notification({
					title: "Outlook",
					body: `You have ${unreadCount} unread emails!`,
				}).show();
			}
		});
}

// Function to update tray tooltip
function updateTrayTooltip(unreadCount) {
	if (tray) {
		tray.setToolTip(unreadCount > 0 ? `Unread Emails: ${unreadCount}` : "No Unread Emails");
	}
}

// Auto-start on login
app.setLoginItemSettings({
	openAtLogin: true,
	openAsHidden: true,
});

// Global shortcuts
app.whenReady().then(() => {
	createWindow();

	// Register global shortcuts
	globalShortcut.register("Control+Shift+O", () => {
		if (mainWindow.isVisible()) {
			mainWindow.hide();
		} else {
			mainWindow.show();
		}
	});

	globalShortcut.register("Control+Shift+R", () => {
		if (mainWindow) {
			mainWindow.reload();
		}
	});

	// Create tray icon
	tray = new Tray(path.join(__dirname, "assets", "icon.png"));
	const contextMenu = Menu.buildFromTemplate([
		{ label: "Show App", click: () => mainWindow.show() },
		{
			label: "Quit",
			click: () => {
				app.isQuitting = true;
				app.quit();
			},
		},
	]);
	tray.setContextMenu(contextMenu);
	tray.setToolTip("Loading...");

	tray.on("click", () => mainWindow.show()); // Show window on tray click
});

// Quit the app when all windows are closed (except for macOS)
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Clean up global shortcuts when app is quitting
app.on("will-quit", () => {
	globalShortcut.unregisterAll();
});

// Handle app activation (macOS)
app.on("activate", () => {
	if (!mainWindow.isVisible()) {
		mainWindow.show();
	}
});

app.whenReady().then(() => {
	// Keep the app running in the background even when the window is closed
	if (process.platform === "darwin") {
		app.dock.show();
	}
});
