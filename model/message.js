"use strict"

const { Alert } = require("./alert");
const { Zvm } = require("./zvm");

class Message {
    constructor(zvm, alert) {
        this.zvm = zvm || new Zvm();
        this.alert = alert || new Alert();
    }
}

exports.Message = Message;
