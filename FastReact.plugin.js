/**
 * @name FastReact
 * @description Instantly react with a default emoji via right-click menu or a chatbar button. Fully customizable from settings.
 * @version 1.0.0
 * @author Azrea Shade
 * @website https://github.com/Azrea631/FastReact
 * @source https://github.com/Azrea631/FastReact
 */

const { Patcher, WebpackModules, ContextMenu, UI, Data, React } = BdApi;

module.exports = class FastReact {
    defaultSettings = {
        emoji: "❤️"
    };

    getSettingsPanel() {
        let settings = Object.assign({}, this.settings);
        return BdApi.React.createElement("div", { style: { padding: "10px" } },
            BdApi.React.createElement("h3", null, "FastReact Settings"),
            BdApi.React.createElement("label", null, "Default Emoji:"),
            BdApi.React.createElement("input", {
                type: "text",
                value: settings.emoji,
                onChange: e => {
                    settings.emoji = e.target.value;
                    this.settings = settings;
                    Data.save("FastReact", "settings", settings);
                },
                style: { width: "50px", fontSize: "20px", textAlign: "center", marginLeft: "10px" }
            })
        );
    }

    start() {
        this.settings = Object.assign({}, this.defaultSettings, Data.load("FastReact", "settings"));
        this.patchMessageContextMenu();
        this.patchChatBar();
    }

    stop() {
        Patcher.unpatchAll();
    }

    patchMessageContextMenu() {
        const MessageContextMenu = WebpackModules.getModule(m => m.default?.displayName === "MessageContextMenu");
        if (!MessageContextMenu) return;
        Patcher.after(MessageContextMenu, "default", (_, [props], ret) => {
            ret.props.children.push(
                ContextMenu.buildMenuItem({
                    label: `React with ${this.settings.emoji}`,
                    action: () => this.reactToMessage(props.message.id),
                })
            );
        });
    }

    patchChatBar() {
        const ChannelTextArea = WebpackModules.getModule(m => m.type?.render?.toString().includes("ChannelTextAreaContainer"));
        if (!ChannelTextArea) return;
        Patcher.after(ChannelTextArea.type, "render", (_, args, ret) => {
            try {
                const buttons = ret.props.children[1].props.children;
                buttons.unshift(
                    BdApi.React.createElement("button", {
                        className: "fastreact-button",
                        onClick: () => this.sendEmoji(),
                        style: {
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "20px",
                            marginRight: "6px"
                        }
                    }, this.settings.emoji)
                );
            } catch (err) {
                console.error("FastReact chatbar patch error:", err);
            }
        });
    }

    reactToMessage(messageId) {
        const ReactionModule = WebpackModules.getByProps("addReaction");
        const SelectedChannelStore = WebpackModules.getByProps("getChannelId");
        ReactionModule.addReaction(
            SelectedChannelStore.getChannelId(),
            messageId,
            { name: this.settings.emoji, id: null, animated: false }
        );
        BdApi.showToast(`Reacted with ${this.settings.emoji}`, { type: "success" });
    }

    sendEmoji() {
        const MessageModule = WebpackModules.getByProps("sendMessage");
        const channelId = WebpackModules.getByProps("getChannelId").getChannelId();
        MessageModule.sendMessage(channelId, { content: this.settings.emoji });
    }
};
