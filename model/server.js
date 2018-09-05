const debug = require('debug')('zerto-slack');
const https = require('https');
const URL = require('url').URL;
const stdio = require('stdio');
const os = require('os');
const async = require('async');

const logger = require('./lib/logger');
const { Cache } = require('./lib');
const { Zvm, Alert, Message } = require('./model');

var ARGS = stdio.getopt({
    'config-file': { args: 1, key: 'c', mandatory: true, description: 'Slack App web hook URI' },
    'log-level': { args: 1, key: 'l', default: 'info', description: 'error|warning|info|verbose' },
    'validate': { description: "Validate configuration file settings" }
});

if(ARGS['log-level'] != "info") {
    debug("Setting log level to %s", ARGS['log-level']);

    logger.level = ARGS['log-level'];
}

const config = require(ARGS['config-file']);

// TO DO:
// 1. Store ZVM login securely
// 2. Better cache management vs. just a variable
// 3. Notify of service start/stop
// 4. Be able to handle connectivity loss to ZVM/Slack

/**
 * General
 */

// Interval in seconds between alert checks
const CHECK_INTERVAL = config.general.interval;

// Slack
const SLACK_HOOK_URL = config.slack.webhookUri;

// Zerto
const ZERTO = Zvm.fromConfig(config);

debug(ZERTO);

const HOSTNAME = os.hostname();

// const ZERTO_ADDRESS = config.zerto.address;
// const ZERTO_PORT = config.zerto.port;

// const ZERTO_USERNAME = config.zerto.username;
// const ZERTO_PASSWORD = config.zerto.password;

/**
 * Global variables
 */

// create notification cache to keep a record of recently sent notifications
// this will be useful with service state transitions to prevent mass sending
// of already sent messages
// NEEDS WORK
// let ALERTS = [];

// message subject will be used to subscribe for new notifications
// let MESSAGE = new Subject();

/**
 * Helper functions
 */

// Extend Date to provide Unix time format for Slack timestamp field
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };

function validate() {
    // Send test alert to validate Slack configuration
    SlackSendTest((success) => {
        if(success) {
            if(ZERTO.length <= 0) {
                throw new Error("At least one Zerto ZVM server must be provided in config file");
            }

            ZERTO.forEach(zvm => {
                logger.info("Testing access to Zerto ZVM " + zvm.label);

                ZertoLogin(zvm, (token, msg) => {
                    if(token) {
                        logger.info("Successfully connected to Zerto ZVM " + zvm.label);
                    } else {
                        throw new Error("Authentication to Zerto ZVM " + zvm.label + " failed " + msg);
                    }
                })
            })
        } else {
            throw new Error("Unable to send test message to Slack app. Check webhook URI");
        }
    })
}

// main wrapper function
function run() {
    let cache = new Cache();

    // Trust no one!
    // Send test alert to validate Slack configuration
    SlackSendTest((success) => {
        if(success) {
            logger.info("Subscribing to Zerto alerts");

            // subscribe to new alerts
            cache.messages().subscribe(msg => SlackSendAlert(msg));
        } else {
            throw new Error("Unable to send test message to Slack app. Check webhook URI");
        }
    })

    // Attempt to login on first run
    async.forEachOf(ZERTO, (zvm, id, callback) => {
        debug(zvm);

        ZertoLogin(zvm, (token, msg) => {
            if(token) {
                // save token value
                ZERTO[id]["token"] = token;
            } else {
                logger.error("Authentication to Zerto ZVM " + zvm.label + " failed " + msg);
            }
    
            // end async task
            callback();
        });
    }, () => {
        // run the loop
        // connect to Zerto and check for new alerts
        logger.info("Starting infinite loop to check Zerto api for alerts every " + CHECK_INTERVAL + " seconds");

        let run = setInterval(() => {
            async.forEachOf(ZERTO, (zvm, id, callback) => {

                let zLabel = zvm.label;

                logger.info("Getting alerts from " + zLabel);
                
                ZertoGetAlerts(zvm, (msg, data) => {
                    if(msg.code == 200) {                
                        let alerts = Alert.fromArrayResponse(data);

                        debug("New alerts ******************> %o", alerts);

                        cache.processNewAlerts(zvm, alerts);
                    } else {
                        logger.error("Failed to get alerts from " + zLabel)
                    }

                    // end async task
                    callback(null);
                })

            }, err => {
                logger.info("Alert check completed for all Zerto ZVM servers");
            })
        }, CHECK_INTERVAL * 1000);
    })
}


/**
 * Run or Validate
 */

if(ARGS["validate"]) {
    validate();
} else {
    run();
}

process.on('SIGINT', () => {
    logger.info('SIGINI...');
    process.exit(0);
});

process.on ('exit', code => {
    logger.info('Exiting with code ' + code);
    process.exit(code);
});

/**
 * Fun and stuff
 */

/**
 * Send test message to Slack using webhook
 * @param {Function} callback 
 */
function SlackSendTest(callback) {
    let url = SLACK_HOOK_URL;

    logger.info("Starting Slack send test using webhook URI " + url);

    let ops = new ReqOptions(url, "POST");
    
    ops.headers = { 
        "content-type": "application/json"
    }

    let timeStamp = new Date(Date.now()).getUnixTime();

    ops.data = {
        "attachments": [
            {
                "fallback": `Service started on ${HOSTNAME}`,
                "color": "#00b5f1",
                "title": `Service started on ${HOSTNAME}`,
                "text": "This service will periodically connect to Zerto ZVM server(s) and relay alerts into this channel",
                "footer": HOSTNAME,
                "ts": timeStamp
            }
        ]
    }

    Request(ops, (data, msg, _) => {
        if(msg.code == 200) {
            logger.info("Slack test success using webhook URI " + url);

            callback(true);
        } else {
            logger.error("Slack test failed using webhook URI " + url);

            callback(false);
        } 
    })
}

/**
 * Send Slack alert
 * @param {Message} message 
 */
function SlackSendAlert(message) {
    let alert = message.alert;
    let zvm = message.zvm;

    let zLabel = zvm.label;

    let url = SLACK_HOOK_URL;

    let ops = new ReqOptions(url, "POST");

    let color = "";

    switch (alert.Level) {
        case "Warning":
            // orange
            color = "#f1a100";
            break;
        case "Error":
            // red
            color = "#f20000";
            break;
        case "Removed":
            // red
            color = "#00f195";
            break;
        default:
            // blue
            color = "#00b5f1"
            break;
    }

    let alertText = "New alert on " + zLabel;
    let alertId = alert.Link.identifier;

    // formating for dismissed alerts
    if(alert.IsDismissed == true) {
        color = "#00b5f1";
        alertText = "Alert dismissed";
    }

    // parse timestamp field
    // "TurnedOn": "/Date(1531938627284)/"
    let ts = "";
    ts = alert.TurnedOn;
    let timeStamp = new Date(parseInt(ts.slice(6, ts.length - 2)));

    // Slack message
    ops.data = { 
        "attachments": [
            {
                "fallback": alertText,
                "color": color,
                "title": alertText,
                "text": alert["Description"],
                "footer": HOSTNAME,
                "ts": timeStamp.getUnixTime(),
                "fields": [
                    {
                        "title": "Entity",
                        "value": alert.Entity,
                        "short": true
                    },
                    {
                        "title": "Id",
                        "value": alert.HelpIdentifier,
                        "short": true
                    }
                ],
            }
        ]
    }

    // Send request to Slack
    Request(ops, (data, msg, _) => {
        if(msg.code == 200) {
            logger.info("Alert sent successfully " + alertId)
        } else {
            debug("Failed to send alert %s %o", alertId, msg);
        } 
    })
}

/**
 * Login to Zerto ZVM server
 * @param {Zvm} zerto 
 * @param {Function} callback (token, errorMessage) => any
 */
function ZertoLogin(zerto, callback) {

    let zPort = zerto.port || 9669;
    let zHost = zerto.address || null;

    if(!zHost) {
        throw new Error("Must provide Zerto address");
    }

    if(!zerto.username || !zerto.password) {
        throw new Error("Must provide Zerto login credetials");
    }

    let bearer = Buffer.from(zerto.username + ":" + zerto.password).toString('base64');

    let loginUrl = `https://${zHost}:${zPort}/v1/session/add`;

    let ops = new ReqOptions(loginUrl, "POST");
    
    ops.headers = { 
        "content-type": "application/json",
        "authorization": "Basic " + bearer
    }

    Request(ops, (_, msg, resp) => {
        if(msg.code == 200) {
            logger.info("Auth success to " + zHost);

            let token = resp.headers["x-zerto-session"] || null;

            callback(token, null);
        } else {
            logger.error("Auth failed " + msg);

            callback(null, msg.text);
        }
    })
}

/**
 * Query Zerto ZVM server for all alerts
 * @param {Zvm} zvm 
 * @param {Function} callback 
 */
function ZertoGetAlerts(zvm, callback) {
    let zPort = zvm.port;
    let zHost = zvm.address;
    let zToken = zvm.token;

    // assume everything is OK to make service run
    // possibly log as error
    // if(!zHost) {
    //     throw new Error("Must provide Zerto address");
    // }

    // if(!zToken) {
    //     throw new Error("Must provide Zerto token");
    // }

    let url = `https://${zHost}:${zPort}/v1/alerts`;

    let ops = new ReqOptions(url, "GET");
    
    ops.headers = { 
        "content-type": "application/json",
        "x-zerto-session": zToken
    }

    Request(ops, (data, msg, _) => {
        let jData = null;

        try {
            jData = JSON.parse(data);
        } catch (error) {
            debug("Can't parse data response")
        }

        callback(msg, jData);
    })
}


/**
 * Request Options
 * @param {string} u URL string
 * @param {string} m HTTP request method (GET|POST|..)
 */
function ReqOptions(u, m) {
    /** Request URL Object */
    this.url = new URL(u);

    /** HTTP request method (GET|POST|..) */
    this.method = m;

    /** HTTP headers as JSON */
    this.headers = null;

    /** Post data */
    this.data = null;
}

/**
 * Send a request to external url
 * @param {ReqOptions} options Request Options
 * @param {Function} callback callback function (data, error, response)
 */
function Request(options, callback) {

    // bare minimum
    if(!options.url || !options.method) {
        throw "Invalid use use Request(options, callback). ReqOptions must provide url and method at the minimum";
    }

    // validate callback
    if(typeof callback != "function") {
        throw "Invalid use use Request(options, callback). callback must be a function"
    }

    // validate headers when present
    if(options.headers) {
        if(typeof options.headers != "object") {
            throw "Invalid use use Request(options, callback). headers arg must be an object of http header entries"
        }
    }

    // validate url search parameters when present
    if(options.search) {
        if(typeof options.search != "object") {
            throw "Invalid use use Request(options, callback). search arg must be an object of url search parameters"
        }
    }

    let reqUrl = options.url;

    let reqOptions = {
        hostname: reqUrl.hostname,
        port: reqUrl.port || 443,
        path: reqUrl.pathname + reqUrl.search || '/',
        method: options.method,
        rejectUnauthorized: false,
        headers: options.headers || { 'content-type': 'application/json' }
    }

    debug("Sending request to %o", reqOptions);

    // POST Data stuff
    let DATA = JSON.stringify(options.data)

    if(options.method == "POST") reqOptions.headers['content-length'] = DATA.length;

    let request = https.request(reqOptions, (_response) => {

        // Response message
        let msg = {
            code: _response.statusCode,
            text: _response.statusMessage
        }

        debug(msg);

        // Response data will be stored here
        let data = '';

        // Process response data stream
        _response.on('data', function (chunk) {
            data += chunk;
        });

        // Setup callback once finished
        _response.on('end', () => {
            if(data) {
                callback(data, msg, _response);
            } else {
                callback(msg, msg, _response);
            }
        })
    });

    // during POST request
    // send data to target server
    if(options.method == "POST") {
        request.write(DATA)
    }
    
    // the end
    // request.end() will completed before
    // the entire message response is received
    request.end();
}
