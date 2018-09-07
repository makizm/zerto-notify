const debug = require('debug')('zerto-slack:cache');
const { Subject } = require('rxjs');
const logger = require('./logger');
const { Message, Alert, Zvm } = require('../model');
const { Store } = require('./storage');

// format
// [{
//   zvm: Zvm,
//   alerts: Alert[]
// }]
let MESSAGES = [];

let MSG_SUBJECT = new Subject();

var Cache = (function () {
    
    function Cache(zvms) {
        debug("Init Cache %o", zvms);

        this.storage = new Store(zvms);
    }

    Cache.prototype.processNewAlerts = function(zvm, alerts) {
        this.runCleanup(zvm, alerts);

        Array.from(alerts).forEach(alert => {
            let isNew = false;
            let storedAlert = this.storage.findAlert(zvm, alert);

            if(storedAlert) {
                debug("isDismissed new: %o stored: %o", alert["IsDismissed"], storedAlert["IsDismissed"]);

                // compare IsDismissed value
                if(alert["IsDismissed"] != storedAlert["IsDismissed"]) {
                    logger.info("IsDismissed value is different from cached. Removing stored entry and this alert will be treated as new");
        
                    this.storage.removeAlert(zvm, storedAlert);
        
                    isNew = true;
                }
            } else {
                isNew = true;
            }

            if(isNew) {
                logger.info("New alert! Saving to cache and dispatching a message for " + alert["Link"]["identifier"]);

                // store this alert
                this.storage.addAlert(zvm, alert);

                // notify subscribers
                MSG_SUBJECT.next(new Message(zvm, alert));
            } else {
                debug("Alert %s already stored. Nothing to do", alert["Link"]["identifier"])
            }
        })
    }

    Cache.prototype.messages = function() {
        return MSG_SUBJECT.asObservable();
    }

    Cache.prototype.runCleanup = function(zvm, newAlerts) {
        logger.info("Running alert cleanup for ZVM " + zvm["label"]);

        // store removed alerts
        // will be used to send notification
        let removed = [];

        let storedAlerts = this.storage.getAlerts(zvm);

        debug("Cleanup > Stored alerts %o", storedAlerts);

        if(storedAlerts.length == 0) {
            logger.info(`Zvm ${zvm["label"]} does not have any stored alerts. Nothing to cleanup`);

            return null;
        }

        if(newAlerts.length == 0) {
            logger.info("Cleanup > No new alerts received. Clearing all stored alerts for ZVM " + zvm["label"]);

            removed = storedAlerts;

            this.storage.removeAllAlerts(zvm);
        } else {
            storedAlerts.forEach(storedAlert => {
                let foundId = newAlerts.findIndex(newAlert => newAlert.Link.identifier == storedAlert["Link"]["identifier"]);
    
                if(foundId == -1) {
                    logger.info("No match so must be stale alert. Removing alert " + storedAlert["Link"]["identifier"]);
    
                    removed.push(storedAlert);
    
                    this.storage.removeAlert(zvm, storedAlert);
                }
            });
        }

        debug("Removed %o", removed);

        // send notifications for any removed entries
        if(removed.length > 0) {
            removed.forEach(alert => {
                // set Level to Removed for proper formatting
                alert["Level"] = "Removed";

                logger.info("Alert removed! Dispatching removed notification for " + alert["Link"]["identifier"]);

                // notify subscribers
                MSG_SUBJECT.next(new Message(zvm, alert));
            })
        }
    }

    return Cache;
}());

exports.Cache = Cache;
