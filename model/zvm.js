"use strict"

class Zvm {
    constructor(label, address, port, username, password, token) {
        this.label = label || null;
        this.address = address || null;
        this.port = port || null;
        this.username = username || null;
        this.password = password || null;
        this.token = token || null;
    }

    static fromConfig(config) {
        let array = []

        if(!config['zerto']) {
            return array;
        }

        Array.from(config['zerto']).forEach(item => {
            array.push(new Zvm(
                item['label'],
                item['address'],
                item['port'],
                item['username'],
                item['password'],
                item['token']
            ))
        })

        return array;
    }
}

exports.Zvm = Zvm;
