/** @type {HTMLInputElement} */
const profileSetupUsernameInput = document.getElementById("profile-setup-username-input");
/** @type {HTMLButtonElement} */
const profileSetupContinueBtn = document.getElementById("profile-setup-continue-btn");
/** @type {HTMLDivElement} */
const createRoomBtnWrapper = document.getElementById("create-room-btn-wrapper");
const creatingSessionText = document.getElementById("creating-session-text");
const permissionsTipBanner = document.getElementById("permissions-tip-banner");

const username = localStorage.getItem("username")?.trim();

if (!username) {
	document.querySelector("div.overlay.blur").classList.add("active");
	document.getElementById("setup-profile-modal").showModal();
} else {
	localStorage.setItem("username", username);
	document.getElementById("username-display").innerText = username;
	document.getElementById("profile-setup-cancel-btn").disabled = false;
}

/**
 * @param username {string}
 */
function setUsername(username) {
	localStorage.setItem("username", username);
	location.reload();
}

profileSetupContinueBtn.onclick = () => {
	setUsername(profileSetupUsernameInput.value);
};

profileSetupUsernameInput.oninput = () => {
	const currentUsername = profileSetupUsernameInput.value.trim();
	profileSetupContinueBtn.disabled = !currentUsername;
};

async function createRoom() {
	creatingSessionText.innerHTML = "<i>security</i>&nbsp;Sprawdzanie uprawnień...";
	createRoomBtnWrapper.setAttribute("data-clicked", "1");
	permissionsTipBanner.className = "active";

	/** @type {?MediaStream} */
	let potentialStream = null;

	try {
		potentialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
	} catch (e) {
		console.log("Permissions denied or error:", e);
		createRoomBtnWrapper.setAttribute("data-clicked", "0");
		ui("#permission-error-snackbar", 2000);
	}

	permissionsTipBanner.className = "";

	if (!potentialStream) {
		return;
	}

	potentialStream.getTracks().forEach(track => track.stop());

	creatingSessionText.innerHTML = "<i>hourglass_bottom</i>&nbsp;Tworzenie sesji...";

	await fetch("/sesja", {
		method: "POST"
	})
		.then(response => response.json())
		.then(roomData => {
			const params = (new URLSearchParams(roomData)).toString();
			location.assign("/panel?" + params);
		})
		.catch(e => {
			console.error(e);
			createRoomBtnWrapper.setAttribute("data-clicked", "0");
			ui("#session-error-snackbar", 3000);
		});
}
