// Import Winston logger
const winston = require('winston');

const myFormat = winston.format.printf(info => {
    return `${info.timestamp} [${info.label}] ${info.level}: ${info.message}`;
});

// Create custom logger using Winston
let logger = winston.createLogger({
    levels: winston.config.syslog.levels,
    transports: [
        new winston.transports.Console({
            handleExceptions: true,
            format: winston.format.combine(
                winston.format.label({ label: 'zerto-slack' }),
                winston.format.simple(),
                winston.format.colorize(),
                winston.format.timestamp(),
                myFormat
            )
        })
    ]
})

// var logger = (function () {
    
//     function Logger() {
//         this.token = null;
//     }

//     return Logger;
// }());

module.exports = logger;
