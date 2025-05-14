chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
	if (message.action === "downloadImage") {
		const imageUrl = message.imageUrl;

		const filename = imageUrl.split("/").pop().split("?")[0];

		chrome.downloads.download(
			{
				url: imageUrl,
				filename: filename,
				saveAs: true,
			},
			(downloadId) => {
				if (chrome.runtime.lastError) {
					console.error("Download failed:", chrome.runtime.lastError);
					sendResponse({
						status: "error",
						message: chrome.runtime.lastError.message,
					});
				} else {
					sendResponse({ status: "downloading", downloadId: downloadId });
				}
			},
		);

		// keep the channel open for the async response
		return true;
	}
});
