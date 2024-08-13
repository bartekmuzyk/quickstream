class Chat {
	/** @type {HTMLInputElement} */
	static messageEditor = document.getElementById("message-editor");
	/** @type {HTMLButtonElement} */
	static sendMessageBtn = document.getElementById("send-message-btn");
	static chatBox = document.getElementById("chat-box");
	static autoScrollSwitch = document.getElementById("auto-scroll-switch");
	/** @type {HTMLInputElement} */
	static autoScrollToggle = document.getElementById("auto-scroll-toggle");
	static fullAutoScrollSupport;

	/**
	 * @param onSend {(content: string) => any}
	 */
	static init(onSend) {
		this.fullAutoScrollSupport = "scrollTopMax" in HTMLDivElement.prototype;

		if (!this.fullAutoScrollSupport) {
			HTMLDivElement.prototype.scrollTopMax = Infinity;

			if (this.autoScrollSwitch) {
				this.autoScrollSwitch.style.display = "block";
			}
		}

		this.messageEditor.oninput = () => {
			this.sendMessageBtn.disabled = this.messageEditor.value.trim().length === 0;
		};

		this.messageEditor.onkeydown = ev => {
			if (ev.key === "Enter" && !ev.shiftKey) {
				this.sendMessageBtn.click();
			}
		};

		this.sendMessageBtn.onclick = () => {
			const messageContent = this.messageEditor.value.trim();
			this.messageEditor.value = "";
			this.sendMessageBtn.disabled = true;

			onSend(messageContent);
		};

		new emojiButtonList("emoji-btn", {
			dropDownXAlign: "right",
			dropDownYAlign: "top",
			textBoxID: this.messageEditor.id
		});
	}

	/**
	 * @param from {string}
	 * @param messageContent {string}
	 */
	static addMessage(from, messageContent) {
		const messageElement = document.createElement("li");

		const senderElement = document.createElement("b");
		senderElement.innerText = from;

		const contentElement = document.createElement("p");
		contentElement.innerText = messageContent;

		messageElement.append(senderElement, contentElement);

		const autoScroll = this.fullAutoScrollSupport ?
			this.chatBox.scrollTop === this.chatBox.scrollTopMax
			:
			(this.autoScrollToggle?.checked ?? true);

		this.chatBox.appendChild(messageElement);

		if (autoScroll) {
			this.chatBox.scrollTo({
				top: this.chatBox.scrollHeight
			});
		}
	}
}
