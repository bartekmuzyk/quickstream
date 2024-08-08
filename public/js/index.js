/** @type {HTMLInputElement} */
const profileSetupUsernameInput = document.getElementById("profile-setup-username-input");
/** @type {HTMLButtonElement} */
const profileSetupContinueBtn = document.getElementById("profile-setup-continue-btn");
/** @type {HTMLDivElement} */
const createRoomBtnWrapper = document.getElementById("create-room-btn-wrapper");

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
	createRoomBtnWrapper.setAttribute("data-clicked", "1");

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
