M.AutoInit(null);
M.Modal.init(document.querySelectorAll(".modal"), {
	dismissible: false
});

/** @type {HTMLInputElement} */
const profileSetupUsernameInput = document.getElementById("profile-setup-username-input");
/** @type {HTMLButtonElement} */
const profileSetupContinueBtn = document.getElementById("profile-setup-continue-btn");
/** @type {HTMLDivElement} */
const createRoomBtnWrapper = document.getElementById("create-room-btn-wrapper");

M.Tooltip.init(document.querySelectorAll("*[data-tooltip]"), {position: "left"});

const username = localStorage.getItem("username")?.trim();

if (!username) {
	const setupProfileModal = M.Modal.getInstance(document.getElementById("setup-profile-modal"));
	setupProfileModal.open();
} else {
	localStorage.setItem("username", username);
	document.getElementById("username-display").innerText = username;
}

/**
 * @param username {string}
 */
function setUsername(username) {
	localStorage.setItem("username", username);
	M.toast({
		html: "Poczekaj na przeładowanie strony...",
		displayLength: Infinity
	});
	location.reload();
}

profileSetupContinueBtn.onclick = () => {
	setUsername(profileSetupUsernameInput.value);
};

profileSetupUsernameInput.oninput = () => {
	const currentUsername = profileSetupUsernameInput.value.trim();
	profileSetupContinueBtn.disabled = !currentUsername;
};

document.getElementById("change-username-btn").onclick = () => {
	const newUsername = prompt("Wpisz nową nazwę użytkownika", username)?.trim();

	if (!newUsername || newUsername === username) return;

	setUsername(newUsername);
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
			M.toast({ html: "Nie udało się utworzyć sesji." });
		});
}
