class Callback {

    constructor() {}

    static add(name, callback) {
        // initialize callback;
        this.getCallbacks();
        if (this.callbacks[name] === undefined) {
            this.callbacks[name] = [callback];
        } else {
            this.callbacks[name].push(callback);
        }
        return true;
    }

    static run(name) {
        var callbacks = this.getCallbacks();
        for (let callback of callbacks[name]) {
            callback.call();
        }

        return true;
    }

    static getCallbacks() {
        if (!this.callbacks) {
            this.callbacks = {};
        }
        return this.callbacks;
    }
}

if (typeof module !== 'undefined') {
    module.exports = Callback;
}
