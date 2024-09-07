class Chat {
	static messagesBox = document.getElementById("chat_messages-box");
	/** @type {HTMLInputElement} */
	static messageEditorInput = document.getElementById("chat_message-editor_input");
	/** @type {HTMLButtonElement} */
	static messageEditorSendBtn = document.getElementById("chat_message-editor_send-btn");

	static autoScrollSwitch = document.getElementById("chat_auto-scroll_switch");
	/** @type {HTMLInputElement} */
	static autoScrollSwitchInput = document.getElementById("chat_auto-scroll_switch-input");

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

		this.messageEditorInput.oninput = () => {
			this.messageEditorSendBtn.disabled = this.messageEditorInput.value.trim().length === 0;
		};

		this.messageEditorInput.onkeydown = ev => {
			if (ev.key === "Enter" && !ev.shiftKey) {
				this.messageEditorSendBtn.click();
			}
		};

		this.messageEditorSendBtn.onclick = () => {
			const messageContent = this.messageEditorInput.value.trim();
			this.messageEditorInput.value = "";
			this.messageEditorSendBtn.disabled = true;

			onSend(messageContent);
		};
	}

	/**
	 * @param from {string}
	 * @param messageContent {string}
	 */
	static addMessage(from, messageContent) {
		const messageElement = document.createElement("div");
		messageElement.classList.add("message");

		const senderElement = document.createElement("b");
		senderElement.innerText = from;

		const contentElement = document.createElement("p");
		contentElement.innerText = messageContent;

		messageElement.append(senderElement, contentElement);

		const autoScroll = this.fullAutoScrollSupport ?
			this.messagesBox.scrollTop === this.messagesBox.scrollTopMax
			:
			(this.autoScrollSwitchInput?.checked ?? true);

		this.messagesBox.appendChild(messageElement);

		if (autoScroll) {
			this.messagesBox.scrollTo({
				top: this.messagesBox.scrollHeight
			});
		}
	}
}
