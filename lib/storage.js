const debug = require('debug')('zerto-slack:store');

const LOG_PREFIX = "Storage >";

let MESSAGES = [];

class Store {

    constructor(zvms) {
        debug("%s Init %o", LOG_PREFIX, zvms);

        if (!zvms) {
            throw new Error("At least one Zvm must be provided to ini Store");
        }

        Array.from(zvms).forEach(zvm => {
            MESSAGES.push({
                zvm: zvm,
                alerts: []
            })
        });
    }

    addAlert(zvm, alert) {
        debug("%s Add new alert %o", LOG_PREFIX, alert);

        if(!alert) {
            debug("%s Alert will not be stored. Alert value is not defined", LOG_PREFIX);

            return false;
        }

        let zvmId = -1;

        if (typeof zvm == "number") {
            zvmId = zvm;
        } else {
            zvmId = this.findIndex(zvm);
        }

        if (zvmId != -1) {
            debug("%s Storing alert for record id %s %o", LOG_PREFIX, zvmId, zvm);

            MESSAGES[zvmId]["alerts"].push(alert);

            return true;
        } else {
            debug("%s Alert will not be stored. Zvm not found %o", LOG_PREFIX, zvm);

            return false;
        }
    }

    removeAlert(zvm, alert) {
        debug("%s Removing alert %o", LOG_PREFIX, alert);

        if(!alert) {
            debug("%s Alert will not be removed. Alert value is not defined", LOG_PREFIX);

            return false;
        }

        let zvmId = this.findIndex(zvm);

        if(zvmId == -1) {
            debug("%s Alert will not be removed. Zvm not found %o", LOG_PREFIX, zvm);

            return false;
        }

        let savedAlertId = this.findAlertIndex(zvmId, alert);

        if(savedAlertId != -1) {
            debug("%s Removing alert id %s from %o", LOG_PREFIX, savedAlertId, zvm);

            MESSAGES[zvmId]["alerts"].splice(savedAlertId, 1);

            return true;
        } else {
            debug("%s Alert will not be removed. Alert not found for %o", LOG_PREFIX, zvm);

            return false;
        }
    }

    removeAllAlerts(zvm) {
        debug("%s Removing all alert for %o", LOG_PREFIX, zvm);

        let zvmId = this.findIndex(zvm);

        if(zvmId == -1) {
            debug("%s Alerts will not be removed. Zvm not found %o", LOG_PREFIX, zvm);

            return false;
        }

        MESSAGES[zvmId]["alerts"] = [];

        return true;
    }

    get(value) {
        if (typeof value == "number") {
            // find by id
            return MESSAGES.find((_, index) => index == value);
        } else if (typeof value == "object") {
            // find by Zvm object
            return MESSAGES.find(item => item["zvm"] == value);
        } else {
            return MESSAGES;
        }
    }

    findIndex(zvm) {
        return MESSAGES.findIndex(item => item["zvm"] == zvm);
    }

    getAlerts(zvm) {
        return this.get(zvm)["alerts"] || [];
    }

    findAlert(zvm, alert) {
        let zvmId = -1;
        let result = null;

        if(typeof zvm == "number") {
            zvmId = zvm;
        } else {
            zvmId = this.findIndex(zvm);
        }

        if(zvmId != -1) {
            result = MESSAGES[zvmId]["alerts"].find(savedAlert => savedAlert["Link"]["identifier"] == alert["Link"]["identifier"]);
        }

        return result;
    }

    findAlertIndex(zvm, alert) {
        let zvmId = -1;
        let alertId = -1;

        if(typeof zvm == "number") {
            zvmId = zvm;
        } else {
            zvmId = this.findIndex(zvm);
        }

        if(zvmId != -1) {
            alertId = MESSAGES[zvmId]["alerts"].findIndex(savedAlert => savedAlert["Link"]["identifier"] == alert["Link"]["identifier"]);
        }

        return alertId;
    }

    isAlertPresent(zvm, alert) {
        let result = this.findAlertIndex(zvm, alert);

        return (result == -1) ? false : true;
    }
}

exports.Store = Store;
