const infoProvider = {
    getPlayerNames() {
        return parent.playerNames;
    },
    setSize(width, height) {
        const iframe = window.frameElement;
        iframe.height = height;
        iframe.width = width;
    },
    notifyInitComplete() {
        parent.callbacks.initcomplete();
    },
    setDisplayCallback(cb) {
        parent.callbacks.display = cb;
    },
    setGameOverCallback(cb) {
        parent.callbacks.gameover = cb;
    },
};
