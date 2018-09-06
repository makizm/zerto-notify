const debug = require('debug')('zerto-slack:cache');
const { Subject } = require('rxjs');
const logger = require('./logger');
const { Message, Alert, Zvm } = require('../model');

// format
// [{
//   zvm: Zvm,
//   alerts: Alert[]
// }]
let MESSAGES = [];

let MSG_SUBJECT = new Subject();

var Cache = (function () {
    
    function Cache() {
        debug("Init Cache");
    }

    Cache.prototype.processNewAlerts = function(zvm, alerts) {
        this.runCleanup(zvm, alerts);

        if(MESSAGES.length > 0) debug("MESSAGES %o", MESSAGES[0]["alerts"]);

        Array.from(alerts).forEach(alert => {
            _saveNewAlert(zvm, alert);
        })
    }

    Cache.prototype.messages = function() {
        return MSG_SUBJECT.asObservable();
    }

    Cache.prototype.runCleanup = function(zvm, newAlerts) {
        _removeStaleAlerts(zvm, newAlerts);
    }

    return Cache;
}());

/**
 * Private functions
 */

/**
 * 
 * @param {Zvm} zvm 
 * @param {Alert} alert 
 */
function _saveNewAlert(zvm, alert) {
    // search zvm in cache
    // will return -1 when nothing is found
    let foundId = MESSAGES.findIndex(stored => stored.zvm == zvm);

    if(foundId != -1) {
        // check for existing at this time
        if(_IsAlertNew(alert, foundId)) {
            logger.info("New alert! Saving to cache and dispatching message " + alert.Link.identifier);

            let msg = new Message(zvm, alert);

            // dispatch new message
            MSG_SUBJECT.next(msg);

            // save to cache
            MESSAGES[foundId].alerts.push(alert);
            
        } else {
            debug("Skipping...");
        }
    } else {
        // this part can be removed by creating zvm entries during init

        // zvm not found, add new entry
        let msg = new Message(zvm, alert);

        // dispatch new message
        MSG_SUBJECT.next(msg);

        MESSAGES.push({
            zvm: zvm,
            alerts: new Array(alert)
        });
    }
}

/**
 * Check alert is not saved and dispatch notification
 * @param {Alert} alert
 * @param {number} zvmId
 */
function _IsAlertNew(alert, zvmId) {
    debug("Checking if alert new %o", alert);

    if(!alert) {
        debug("IsAlertNew > Alert is null");

        // this is not normal, log error
        logger.error("IsAlertNew > alert is null. Returning false");

        return false;
    }

    // this will save some time
    if(MESSAGES.length == 0) {
        debug("IsAlertNew > Cache is empty. Assume alert is new")

        return true;
    }

    let isNew = false;

    let Zvm = MESSAGES[zvmId];

    // check if alert is stored in cache
    // returns -1 when entry is not present
    let savedAlertId = Zvm.alerts.findIndex(savedAlert => savedAlert["Link"]["identifier"] == alert["Link"]["identifier"]);

    if(savedAlertId == -1) {
        // alert not found in cache aka new
        debug("IsAlertNew > Alert is new %s", alert.Link.identifier);

        isNew = true;
    } else {
        // found in cache
        debug("IsAlertNew > Alert already exists %s", alert.Link.identifier);

        // check if alert IsDismissed value changed
        if(alert.IsDismissed != Zvm.alerts[savedAlertId]["IsDismissed"]) {
            // remove from cache and return new
            debug("IsAlertNew > IsDismissed value is different from cached. Alert will be treated as new");

            let deleted = MESSAGES[zvmId].alerts.splice(savedAlertId, 1);
            
            debug("IsAlertNew > Removed message %o", deleted);

            isNew = true;
        }
    }

    return isNew;
}

/**
 * Compare new batch of alerts vs cached entries and remove any that no longer exist
 * @param {Alert[]} newAlerts
 * @param {Zvm} zvm
 */
function _removeStaleAlerts(zvm, newAlerts) {
    logger.info("Running alert cleanup for ZVM " + zvm.label);

    // no need to run if nothing is saved
    if(MESSAGES.length == 0) {
        logger.info("Cleanup > Cache is empty, nothing to do");

        return false;
    }

    let foundId = MESSAGES.findIndex(stored => stored.zvm == zvm);

    if(foundId != -1) {
        if(newAlerts.length == 0) {
            debug("Cleanup > No new alerts received for cleanup. Clearing all entries for this ZVM");
    
            // no alerts for this zvm, empty all saved alerts
            if(MESSAGES[foundId].alerts.length > 0) {
                MESSAGES[foundId].alerts.forEach(alert => {
                    alert["Level"] = "Removed";

                    logger.info("Cleanup > Dispatching alert cleared " + alert["Link"]["identifier"]);

                    let newMsg = new Message(zvm, alert);

                    // notify subscribers
                    MSG_SUBJECT.next(newMsg);
                })

                MESSAGES[foundId].alerts = [];
            }
            
            return false;
        }

        MESSAGES[foundId].alerts.forEach((storedAlert, storedAlertId) => {

            debug("Cleanup > Processing cached alert %o", storedAlert);

            let foundId = newAlerts.findIndex(newAlert => newAlert.Link.identifier == storedAlert["Link"]["identifier"]);
        
            if(foundId == -1) {
                debug("No match so must be stale alert. Removing");

                debug("Removing stale alert %o", storedAlert);
                
                let deleted = MESSAGES[foundId].alerts.splice(storedAlertId, 1);

                // set Level to Removed for proper formatting
                // this will be used later for formatting
                deleted[0]["Level"] = "Removed";

                logger.info("Cleanup > Dispatching alert cleared " + deleted[0]["Link"]["identifier"]);

                let newMsg = new Message(zvm, deleted[0])

                // notify subscribers
                MSG_SUBJECT.next(newMsg);
            } else {
                debug("Skipping... Due to match found in cache");
            }
        })
    } else {
        return false;
    }

    return true;
}

exports.Cache = Cache;
