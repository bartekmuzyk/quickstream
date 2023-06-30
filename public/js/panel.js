M.AutoInit(null);
M.Modal.init(document.querySelectorAll(".modal"), {
	dismissible: false
});

/** @type {HTMLButtonElement} */
const goLiveBtn = document.getElementById("go-live-btn");
/** @type {HTMLButtonElement} */
const stopStreamBtn = document.getElementById("stop-stream-btn");
const liveStatus = document.getElementById("live-status");
const statusBar = document.getElementById("status-bar");
/** @type {HTMLVideoElement} */
const streamPreview = document.getElementById("stream-preview");
const errorMessageDisplay = document.getElementById("error-message");
const connectionErrorModal = M.Modal.getInstance(document.getElementById("connection-error-modal"));
const disconnectReasonDisplay = document.getElementById("disconnect-reason");
const disconnectionModal = M.Modal.getInstance(document.getElementById("disconnection-modal"));
const viewersList = document.getElementById("viewers-list");
const withAudioCheckbox = document.getElementById("with-audio-checkbox");

/**
 * @param status {"stopped"|"progress"|"started"}
 */
function setStreamStateDisplay(status) {
	statusBar.setAttribute("data-livestatus", status);

	switch (status) {
		case "started": liveStatus.innerText = "Transmituję na żywo"; break;
		case "progress": liveStatus.innerText = "Proszę czekać..."; break;
		case "stopped": liveStatus.innerText = "Transmisja wstrzymana"; break;
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
	goLiveBtn.disabled = false;
	M.toast({ html: "Połączono z serwerem", displayLength: 1500 });

	window.onbeforeunload = ev => {
		const message = "Jeżeli stream został już rozpoczęty, zostanie on zakończony przy odświeżeniu strony.";
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
		goLiveBtn.style.display = "none";
		stopStreamBtn.style.display = "block";
	}
});

socket.on("stream:viewers", viewersData => {
	const listItems = Object.entries(viewersData).map(([ socketId, username ]) => {
		const listItem = document.createElement("div");

		const userIcon = document.createElement("i");
		userIcon.className = "material-icons white-text";
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

	await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

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
			M.toast({ html: `Skopiowano&nbsp;<a href="${url}" target="_blank">link do transmisji</a>` });
		});
};

/**
 * @typedef {Object} StreamSource
 * @property {string} id id of the source. will begin with `window:` if the source is a window, and with `screen:` if it is a screen
 * @property {string} name app/screen name
 * @property {?string} icon icon data as a data URL. `undefined` if the source is a screen.
 */

goLiveBtn.onclick = async () => {
	goLiveBtn.disabled = true;
	withAudioCheckbox.parentElement.style.visibility = "hidden";
	setStreamStateDisplay("progress");

	const stream = await navigator.mediaDevices.getDisplayMedia({
		video: true,
		audio: {
			autoGainControl: false,
			channelCount: 2,
			echoCancellation: false,
			latency: 0,
			noiseSuppression: false,
			sampleRate: 48000,
			sampleSize: 16
		}
	});
	streamPreview.srcObject = stream;
	await streamPreview.play();

	if (withAudioCheckbox.checked) {
		const audioStream = await navigator.mediaDevices.getUserMedia({
			video: false,
			audio: true
		});
		stream.addTrack(audioStream.getTracks()[0]);
	}

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

	M.toast({ html: "Transmisja zakończona. Proszę czekać..." });
	location.assign("/");
};

Chat.init(content => socket.emit("stream:sendMessage", content))
socket.on("stream:message", (from, messageContent) => Chat.addMessage(from, messageContent));
