/** @type {HTMLButtonElement} */
const prepareStreamBtn = document.getElementById("prepare-stream-btn");
/** @type {HTMLButtonElement} */
const goLiveBtn = document.getElementById("go-live-btn");
/** @type {HTMLButtonElement} */
const stopStreamBtn = document.getElementById("stop-stream-btn");
const liveStatusText = document.getElementById("live-status-text");
const liveStatusDot = document.getElementById("live-status-dot");
/** @type {HTMLVideoElement} */
const streamPreview = document.getElementById("stream-preview");
const errorMessageDisplay = document.getElementById("error-message");
const connectionErrorModal = document.getElementById("connection-error-modal");
const disconnectReasonDisplay = document.getElementById("disconnect-reason");
const disconnectionModal = document.getElementById("disconnection-modal");
const viewersList = document.getElementById("viewers-list");

/** @type {HTMLButtonElement} */
const preparationBackBtn = document.getElementById("prepare-stream-dialog_back-btn");
const preparationAudioEnabledToggle = document.getElementById("prepare-stream-dialog_pages_audio-page_audio-enabled");
const preparationAudioFromPcToggle = document.getElementById("prepare-stream-dialog_pages_audio-page_audio-from-pc");
const preparationAudioFromDeviceToggle = document.getElementById("prepare-stream-dialog_pages_audio-page_audio-from-device");
const preparationAudioInputSelector = document.getElementById("prepare-stream-dialog_pages_audio-page_audio-input-selector");
const preparationAudioNextBtn = document.getElementById("prepare-stream-dialog_pages_audio-page_next-btn");
const preparationSummaryVideoSourceText = document.getElementById("prepare-stream-dialog_pages_summary-page_video_source_text");
const preparationSummaryAudioSourceText = document.getElementById("prepare-stream-dialog_pages_summary-page_audio_source_text");

const preparationPages = {
	"video": document.getElementById("prepare-stream-dialog_pages_video-page"),
	"audio": document.getElementById("prepare-stream-dialog_pages_audio-page"),
	"summary": document.getElementById("prepare-stream-dialog_pages_summary-page")
};
const preparationSteppers = {
	"audio": document.getElementById("prepare-stream-dialog_steppers_audio"),
	"summary": document.getElementById("prepare-stream-dialog_steppers_summary")
};

/** @type {{
 * 		video: ?(MediaDeviceInfo|"screen"),
 * 		audio: ?{device: ?{deviceId: string, label: string}, screen: boolean}
 * }} */
const selectedSources = {video: null, audio: null};

/**
 * @param status {"stopped"|"progress"|"started"}
 */
function setStreamStateDisplay(status) {
	liveStatusDot.setAttribute("data-status", status);

	switch (status) {
		case "started": liveStatusText.innerText = "Transmituję na żywo"; break;
		case "progress": liveStatusText.innerText = "Proszę czekać..."; break;
		case "stopped": liveStatusText.innerText = "Transmisja wstrzymana"; break;
	}
}

function updatePreparationUi() {
	if (!selectedSources.video) {
		preparationSteppers["audio"].className = "circle small fill";
		preparationSteppers["summary"].className = "circle small fill";

		ui("#" + preparationPages["video"].id);

		preparationBackBtn.onclick = null;
		preparationBackBtn.disabled = true;
	} else if (!selectedSources.audio) {
		preparationSteppers["audio"].className = "circle small";
		preparationSteppers["summary"].className = "circle small fill";

		preparationAudioEnabledToggle.checked = true;
		preparationAudioFromPcToggle.disabled = selectedSources.video !== "screen";
		preparationAudioFromPcToggle.checked = false;
		preparationAudioFromDeviceToggle.disabled = false;
		preparationAudioFromDeviceToggle.checked = false
		preparationAudioInputSelector.disabled = true;

		ui("#" + preparationPages["audio"].id);

		preparationBackBtn.onclick = () => {
			selectedSources.video = null;
			updatePreparationUi();
		};
		preparationBackBtn.disabled = false;
	} else {
		preparationSteppers["audio"].className = "circle small";
		preparationSteppers["summary"].className = "circle small";

		preparationSummaryVideoSourceText.innerText = selectedSources.video === "screen" ?
			"Z komputera"
			:
			selectedSources.video.label;
		preparationSummaryAudioSourceText.innerText = selectedSources.audio.device ?
			selectedSources.audio.screen ?
				`${selectedSources.audio.device.label} + z komputera`
				:
				selectedSources.audio.device.label
			:
			selectedSources.audio.screen ?
				"Z komputera"
				:
				"Brak"

		ui("#" + preparationPages["summary"].id);

		preparationBackBtn.onclick = () => {
			selectedSources.audio = null;
			updatePreparationUi();
		};
		preparationBackBtn.disabled = false;
	}
}

/**
 * @param videoInputs {MediaDeviceInfo[]}
 * @param audioInputs {MediaDeviceInfo[]}
 */
async function refreshInputDevicesSelectors(videoInputs, audioInputs) {
	console.log("videoInputs: %o\naudioInputs: %o", videoInputs, audioInputs);

	// Video devices
	preparationPages["video"].innerHTML = "";

	const previewBoxes = {};
	const sourceSelectionBoxes = videoInputs.map(videoInput => {
		const sourceSelectionBox = document.createElement("div");
		sourceSelectionBox.classList.add("source-selection-box");
		sourceSelectionBox.onclick = () => {
			selectedSources.video = videoInput;
			updatePreparationUi();
		};

		const previewBox = document.createElement("div");
		previewBoxes[videoInput.deviceId] = previewBox;
		sourceSelectionBox.appendChild(previewBox);

		const label = document.createElement("label");
		label.innerText = videoInput.label
		sourceSelectionBox.appendChild(label);

		return sourceSelectionBox;
	});

	const localSourceSelectionBox = document.createElement("div");
	localSourceSelectionBox.classList.add("source-selection-box");
	localSourceSelectionBox.innerHTML = "<div><i>desktop_windows</i></div><label>Z komputera</label>";
	localSourceSelectionBox.onclick = () => {
		selectedSources.video = "screen";
		updatePreparationUi();
	};

	preparationPages["video"].append(localSourceSelectionBox, ...sourceSelectionBoxes);

	for (const [deviceId, previewBox] of Object.entries(previewBoxes)) {
		/** @type {?MediaStream} */
		let stream = null;

		try {
			stream = await navigator.mediaDevices.getUserMedia({
				video: {
					deviceId: {
						exact: deviceId,
					}
				},
				audio: false
			});
		} catch (e) {
			console.warn("Failed to get stream for device %s: %o", deviceId, e);
			previewBox.innerHTML = "<i>videocam</i>";
			continue;
		}

		try {
			const video = document.createElement("video");
			video.srcObject = stream;
			await video.play()

			const canvas = document.createElement("canvas");
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;

			const context = canvas.getContext("2d");
			context.drawImage(video, 0, 0, canvas.width, canvas.height);

			const dataURL = canvas.toDataURL("image/png");

			previewBox.style.backgroundImage = `url("${dataURL}")`;
		} catch (e) {
			console.warn("Failed to get preview from stream for device %s: %o", deviceId, e);
			previewBox.innerHTML = "<i>videocam</i>";
		}

		stream.getTracks().forEach(track => track.stop());
	}

	// Audio devices
	preparationAudioInputSelector.innerHTML = "";

	for (const audioInput of audioInputs) {
		const option = document.createElement("option");
		option.value = audioInput.deviceId;
		option.innerText = audioInput.label;

		preparationAudioInputSelector.appendChild(option);
	}
}

const username = localStorage.getItem("username")?.trim();

if (!username) {
	location.assign("/")
}

const params = new URLSearchParams(location.search);
const sessionId = params.get("sessionId");
const ownerKey = params.get("ownerKey");

if (!sessionId || !ownerKey) {
	location.assign("/");
}

const socket = io(undefined, {
	auth: {
		username,
		ownerKey
	},
	query: {
		sessionId
	}
});

socket.on("connect", () => {
	setStreamStateDisplay("stopped");
	prepareStreamBtn.disabled = false;
	ui("#connected-message-snackbar", 1500);

	window.onbeforeunload = ev => {
		const message = "Sesja zostanie utracona przy odświeżaniu strony.";
		ev.returnValue = message;
		return message;
	};
});

socket.on("connect_error", err => {
	window.onbeforeunload = null;

	errorMessageDisplay.innerText = err.message;
	connectionErrorModal.open();
});

socket.on("disconnect", reason => {
	window.onbeforeunload = null;

	if (reason !== "io client disconnect") {
		disconnectReasonDisplay.innerText = reason;
		disconnectionModal.open();
	}
});

socket.on("stream:state", state => {
	console.log(`state change: ${state}`)
	setStreamStateDisplay(state);

	if (state === "started") {
		prepareStreamBtn.style.display = "none";
		stopStreamBtn.style.display = "inline-flex";
	}
});

socket.on("stream:viewers", viewersData => {
	const listItems = Object.entries(viewersData).map(([ socketId, username ]) => {
		const listItem = document.createElement("div");

		const userIcon = document.createElement("i");
		userIcon.innerText = "person";
		listItem.append(userIcon);

		const usernameText = document.createElement("span");
		usernameText.innerText = String(username);
		usernameText.setAttribute("data-socketid", socketId);
		listItem.append(usernameText);

		return listItem;
	});

	viewersList.innerHTML = "";
	viewersList.append(...listItems);
});

const ICEConfiguration = {
	iceServers: [
		{
			urls: "stun:stun.l.google.com:19302"
		}
	]
};

/**
 * Maps socket ID's to their respective WebRTC peer connections
 * @type {Object<string, RTCPeerConnection>}
 */
const peerConnections = {};
/** @type {?MediaStream} */
let currentStream = null;

socket.on("rtc:offer", async (offer, socketId) => {
	console.log("got offer");
	const peerConnection = new RTCPeerConnection(ICEConfiguration);
	peerConnections[socketId] = peerConnection;

	peerConnection.addEventListener("icecandidate", ev => {
		console.log(`icecandidate event. sending to socket ${socketId}`);
		socket.emit("rtc:iceCandidate", socketId, ev.candidate);
	});

	currentStream.getTracks().forEach(track => {
		console.log("adding track %o", track);
		peerConnection.addTrack(track, currentStream);
	});

	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));  // todo deprecated

	const answer = await peerConnection.createAnswer();
	answer.sdp = answer.sdp.replace("useinbandfec=1", "useinbandfec=1; stereo=1; maxaveragebitrate=510000");
	await peerConnection.setLocalDescription(answer);

	console.log("sending answer");
	socket.emit("rtc:answer", socketId, answer);
});

socket.on("rtc:iceCandidate", async (socketId, candidate) => {
	console.log(`got ICE candidate from ${socketId}`);
	await peerConnections[socketId].addIceCandidate(candidate);
});

socket.on("stream:userLeft", socketId => {
	peerConnections[socketId].close();
	delete peerConnections[socketId];
	document.querySelector(`#viewers-list > div[data-socketid="${socketId}"]`).remove()
});

document.getElementById("copy-safe-link-btn").onclick = () => {
	const url = location.origin + "/ogladaj?id=" + sessionId;
	navigator.clipboard.writeText(url)
		.then(() => {
			// todo jakieś coś innego
		});
};

/**
 * @typedef {Object} StreamSource
 * @property {string} id id of the source. will begin with `window:` if the source is a window, and with `screen:` if it is a screen
 * @property {string} name app/screen name
 * @property {?string} icon icon data as a data URL. `undefined` if the source is a screen.
 */

goLiveBtn.onclick = async () => {
	if (!selectedSources.video || !selectedSources.audio) {
		return;
	}

	goLiveBtn.disabled = true;
	setStreamStateDisplay("progress");

	const audioContext = new AudioContext();

	const audioDestination = audioContext.createMediaStreamDestination();

	const desktopStream = await navigator.mediaDevices.getDisplayMedia({
		video: true,
		audio: selectedSources.audio.screen ?
			{
				autoGainControl: false,
				channelCount: 2,
				echoCancellation: false,
				latency: 0,
				noiseSuppression: false,
				sampleRate: 48000,
				sampleSize: 16
			}
			:
			false
	});

	if (selectedSources.audio.screen) {
		const desktopAudioSource = audioContext.createMediaStreamSource(desktopStream);
		desktopAudioSource.connect(audioDestination);
	}

	if (selectedSources.audio.device) {
		const deviceStream = await navigator.mediaDevices.getUserMedia({
			video: false,
			audio: {
				deviceId: {
					exact: selectedSources.audio.device.deviceId
				}
			}
		});
		const deviceAudioSource = audioContext.createMediaStreamSource(deviceStream);
		deviceAudioSource.connect(audioDestination);
	}

	const stream = new MediaStream();
	desktopStream.getVideoTracks().forEach(track => stream.addTrack(track));
	audioDestination.stream.getAudioTracks().forEach(track => stream.addTrack(track));

	streamPreview.srcObject = stream;
	await streamPreview.play();

	currentStream = stream;
	socket.emit("stream:start");
};

stopStreamBtn.onclick = () => {
	window.onbeforeunload = null;
	stopStreamBtn.disabled = true;
	setStreamStateDisplay("progress");

	for (const [ socketId, peerConnection ] of Object.entries(peerConnections)) {
		peerConnection.close();
		delete peerConnections[socketId];
	}

	currentStream.getTracks().forEach(track => track.stop());
	socket.emit("stream:stop");

	location.assign("/");
};

Chat.init(content => socket.emit("stream:sendMessage", content))
socket.on("stream:message", (from, messageContent) => Chat.addMessage(from, messageContent));

preparationAudioEnabledToggle.onchange = () => {
	if (preparationAudioEnabledToggle.checked) {
		preparationAudioFromPcToggle.disabled = selectedSources.video !== "screen";
		preparationAudioFromDeviceToggle.disabled = false;
	} else {
		preparationAudioFromPcToggle.disabled = true;
		preparationAudioFromPcToggle.checked = false;
		preparationAudioFromDeviceToggle.disabled = true;
		preparationAudioFromDeviceToggle.checked = false;
		preparationAudioInputSelector.disabled = true;
	}
};

preparationAudioFromDeviceToggle.onchange = () => {
	preparationAudioInputSelector.disabled = !preparationAudioFromDeviceToggle.checked;
};

preparationAudioNextBtn.onclick = () => {
	if (preparationAudioEnabledToggle.checked) {
		selectedSources.audio = {device: null, screen: preparationAudioFromPcToggle.checked};

		if (preparationAudioFromDeviceToggle.checked) {
			const deviceId = preparationAudioInputSelector.value;
			const label = preparationAudioInputSelector.querySelector(`option[value="${deviceId}"]`)?.innerText ?? "Nieznane urządzenie";
			selectedSources.audio.device = {deviceId, label};
		}
	} else {
		selectedSources.audio = {device: null, screen: false};
	}

	updatePreparationUi();
};

// Scan media input devices
if (!navigator.mediaDevices?.enumerateDevices) {
	console.log("enumerateDevices() not supported. App will rely on the user choosing devices manually.");
} else {
	navigator.mediaDevices
		.enumerateDevices()
		.then((devices) => {
			const videoInputs = devices.filter(device => device.kind === "videoinput");
			const audioInputs = devices.filter(device => device.kind === "audioinput");

			refreshInputDevicesSelectors(videoInputs, audioInputs);
		})
		.catch((err) => {
			console.error(`enumerateDevices() - ${err.name}: ${err.message}`);
		});
}
