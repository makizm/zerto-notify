# zerto-notify
Zerto alert notifications for Slack

## About
zerto-notify is meant to be run by nodejs as systemd service. It will periodically connect to specified Zerto ZVM servers in config file and check for any alerts. New alerts will be stored in memory and Slack notification will be sent using webhook URL in config file.

## Setup Slack
First, setup your Slack workspace. Create a Slack app and enable Incoming Webhooks

https://get.slack.help/hc/en-us/articles/115005265063-Incoming-WebHooks-for-Slack

## Setup Zerto
For each Zerto ZVM server create a service user account (on hypervisor) with sufficient permissions. Next, note IP/hostname of this ZVM and come up with an elaborate label.

## Install
Install NodeJS 10.x https://nodejs.org/en/download/package-manager/

```
mkdir /opt/zerto-notify
cd /opt/zerto-notify
git clone https://github.com/makizm/zerto-notify.git .
npm install
cp config-example.json config.json
useradd -r nodejs
chown root:nodejs config.json
chmod 640 config.json
```

server.js does not need execute flag since it's not being run directly but via NodeJS

## Config file

> general
>> interval: number of seconds between alert checks
> slack
>> webhookUri: URI of Slack app webhook
> zerto: array of Zerto ZVM server connection settings
>> [] label: text label for this server instance used in logs and notifications
>> [] address: IP address or hostname
>> [] port: connection port, default is 9669
>> [] username: login username
>> [] password: login password
>> [] token: auth token (place holder for the future)

#### Config xample:
```json
{
    "general": {
        "interval": 30
    },
    "slack": {
        "webhookUri": "https://hooks.slack.com/services/foo/bar"
    },
    "zerto": [
        {
            "label": "zvm1",
            "address": "192.168.1.11",
            "port": 9669,
            "username" : "alert-user@vsphere.local",
            "password" : "topsecret",
            "token": ""
        },
        {
            "label": "zvm2",
            "address": "192.168.1.12",
            "port": 9669,
            "username" : "alert-user@vsphere.local",
            "password" : "topsecret",
            "token": ""
        }
    ]
}
```

## Dry run
```
node server.js --config-file ./config.json --verify
```

## Run
```
node server.js --config-file ./config.json
```

## Debug
```
DEBUG=zerto-slack:* node server.js --config-file ./config.json
```

## Register as a systemd service
```
sudo systemctl link /opt/zerto-notify/zerto-notify.service
sudo systemctl daemon-reload
sudo systemctl start zerto-notify.service
```
