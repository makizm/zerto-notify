"use strict"

class Alert {
    constructor(
        AffectedVpgs,
        AffectedZorgs,
        Description,
        Entity,
        HelpIdentifier,
        IsDismissed,
        Level,
        Link,
        Site,
        TurnedOn
    ) {
        this.AffectedVpgs = AffectedVpgs || []
        this.AffectedZorgs = AffectedZorgs || []
        this.Description = Description || null;
        this.Entity = Entity || null;
        this.HelpIdentifier = HelpIdentifier || null;
        this.IsDismissed = (IsDismissed === true) ? true : false;
        this.Level = Level || null;
        this.Link = {
            href: Link ? Link["href"] : null,
            identifier: Link ? Link["identifier"] : null,
            rel: Link ? Link["rel"] : null,
            type: Link ? Link["type"] : null
        };
        this.Site = {
            href: Site ? Site["href"] : null,
            identifier: Site ? Site["identifier"] : null,
            rel: Site ? Site["rel"] : null,
            type: Site ? Site["type"] : null
        };
        this.TurnedOn = TurnedOn || null;
    }

    static fromResponse(resp) {
        return new Alert(
            resp["AffectedVpgs"],
            resp["AffectedZorgs"],
            resp["Description"],
            resp["Entity"],
            resp["HelpIdentifier"],
            resp["IsDismissed"],
            resp["Level"],
            resp["Link"],
            resp["Site"],
            resp["TurnedOn"]
        );
    }

    static fromArrayResponse(array) {
        let out = [];

        if(array) {
            Array.from(array).forEach(item => {
                out.push(new Alert(
                    item["AffectedVpgs"],
                    item["AffectedZorgs"],
                    item["Description"],
                    item["Entity"],
                    item["HelpIdentifier"],
                    item["IsDismissed"],
                    item["Level"],
                    item["Link"],
                    item["Site"],
                    item["TurnedOn"]
                ));
            });
        }

        return out;
    }
}

exports.Alert = Alert;
