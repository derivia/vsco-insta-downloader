(() => {
	function ensureProtocol(url) {
		if (url.startsWith("//")) {
			return "https:" + url;
		}
		return url;
	}

	function addDownloadButton(container, imageUrl, _ = {}) {
		if (container.querySelector(".image-download-btn")) return;

		const downloadBtn = document.createElement("div");
		downloadBtn.className = "image-download-btn";
		downloadBtn.innerHTML = "↓";
		downloadBtn.title = "Download Image";

		const baseStyles = {
			position: "absolute",
			top: "12px",
			right: "12px",
			backgroundColor: "rgba(0, 0, 0, 0.6)",
			color: "white",
			borderRadius: "50%",
			width: "30px",
			height: "30px",
			display: "flex",
			justifyContent: "center",
			alignItems: "center",
			cursor: "pointer",
			fontSize: "16px",
			zIndex: "9999",
			opacity: "0",
			transition: "opacity 0.2s ease",
		};

		Object.assign(downloadBtn.style, baseStyles);

		container.addEventListener("mouseenter", () => {
			downloadBtn.style.opacity = "1";
		});

		container.addEventListener("mouseleave", () => {
			downloadBtn.style.opacity = "0.6";
		});

		downloadBtn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();

			chrome.runtime.sendMessage(
				{
					action: "downloadImage",
					imageUrl: imageUrl,
				},
				(response) => {
					if (response && response.status === "downloading") {
						downloadBtn.innerHTML = "✓";
						setTimeout(() => {
							downloadBtn.innerHTML = "↓";
						}, 1500);
					}
				},
			);
		});

		const containerPosition = window.getComputedStyle(container).position;
		if (containerPosition !== "relative" && containerPosition !== "absolute") {
			container.style.position = "relative";
		}

		container.appendChild(downloadBtn);
	}

	// VSCO specific functions
	function getHighestResVscoImageUrl(srcset) {
		if (!srcset) return null;

		const sources = srcset.split(",").map((src) => {
			const [url, width] = src.trim().split(" ");
			return {
				url: url.trim(),
				width: parseInt(width),
			};
		});

		sources.sort((a, b) => b.width - a.width);
		return sources.length > 0 ? sources[0].url : null;
	}

	function getCleanVscoImageUrl(url) {
		const baseUrl = url.split("?")[0];
		const cleanUrl = `${baseUrl}?w=2048`;
		return ensureProtocol(cleanUrl);
	}

	function addVscoDownloadButtons() {
		const imageContainers = document.querySelectorAll(
			'.css-7eh5aw, [class*="grid__"], [class*="media-"]',
		);

		imageContainers.forEach((container) => {
			if (container.querySelector(".image-download-btn")) return;

			const img = container.querySelector('img[srcset], img[src*="vsco"]');
			if (!img) return;

			const highResUrl =
				img.dataset.vscoDownloadUrl ||
				(img.srcset ? getHighestResVscoImageUrl(img.srcset) : null) ||
				img.src;

			if (!highResUrl) return;

			const cleanImageUrl = getCleanVscoImageUrl(highResUrl);
			addDownloadButton(container, cleanImageUrl);
		});
	}

	// Instagram specific functions
	function getHighestResInstagramImageUrl(srcset) {
		if (!srcset) return null;

		const sources = srcset.split(",").map((src) => {
			const parts = src.trim().split(" ");
			const widthStr = parts[parts.length - 1];
			const width = parseInt(widthStr);
			const url = parts.slice(0, parts.length - 1).join(" ");

			return {
				url: url.trim(),
				width: isNaN(width) ? 0 : width,
			};
		});

		sources.sort((a, b) => b.width - a.width);
		return sources.length > 0 ? sources[0].url : null;
	}

	function getCleanInstagramImageUrl(url) {
		return ensureProtocol(url);
	}

	function addInstagramDownloadButtons() {
		const igImageContainers = document.querySelectorAll(
			"div._aagv, " + "li._acaz div._aagu",
		);

		igImageContainers.forEach((container) => {
			if (container.querySelector(".image-download-btn")) return;

			const img = container.querySelector("img");
			if (!img) return;

			let highResUrl;
			if (img.srcset) {
				highResUrl = getHighestResInstagramImageUrl(img.srcset);
			}

			if (!highResUrl) {
				highResUrl = img.src;
			}

			if (!highResUrl) return;

			let buttonContainer = container;
			while (
				buttonContainer &&
				(buttonContainer.offsetWidth < 100 ||
					buttonContainer.offsetHeight < 100)
			) {
				buttonContainer = buttonContainer.parentElement;
				if (!buttonContainer) break;
			}

			if (!buttonContainer) return;

			const cleanImageUrl = getCleanInstagramImageUrl(highResUrl);
			addDownloadButton(buttonContainer, cleanImageUrl);
		});
	}

	function initialize() {
		const currentHost = window.location.hostname;

		if (currentHost.includes("vsco.co")) {
			addVscoDownloadButtons();
		} else if (currentHost.includes("instagram.com")) {
			addInstagramDownloadButtons();
		}

		const observer = new MutationObserver((mutations) => {
			let shouldProcessVsco = false;
			let shouldProcessInstagram = false;

			if (currentHost.includes("vsco.co")) {
				for (const mutation of mutations) {
					if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
						for (const node of mutation.addedNodes) {
							if (
								node.nodeType === Node.ELEMENT_NODE &&
								(node.tagName === "IMG" ||
									node.querySelector("img") ||
									(node.style &&
										node.style.backgroundImage &&
										node.style.backgroundImage.includes("vsco")))
							) {
								shouldProcessVsco = true;
								break;
							}
						}
					}
					if (shouldProcessVsco) break;
				}
			} else if (currentHost.includes("instagram.com")) {
				shouldProcessInstagram = true;
			}

			if (shouldProcessVsco) {
				addVscoDownloadButtons();
			}

			if (shouldProcessInstagram) {
				addInstagramDownloadButtons();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize);
	} else {
		initialize();
	}

	window.addEventListener("load", () => {
		setTimeout(() => {
			const currentHost = window.location.hostname;
			if (currentHost.includes("vsco.co")) {
				addVscoDownloadButtons();
			} else if (currentHost.includes("instagram.com")) {
				addInstagramDownloadButtons();
			}
		}, 600);
	});

	if (window.location.hostname.includes("instagram.com")) {
		setInterval(() => {
			addInstagramDownloadButtons();
		}, 1500);
	}
})();
