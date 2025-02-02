const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
	checkUnread: () => {
		setInterval(() => {
			const unreadBadge = document.querySelector("title")?.textContent;
			ipcRenderer.send("update-badge", unreadBadge);
		}, 5000);
	},
});

ipcRenderer.on("check-unread", () => {
	window.electron.checkUnread();
});
