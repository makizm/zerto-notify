export class Alert {
    AffectedVpgs: Array<{ href: string, identifier: string, rel: string, type: string }>;
    AffectedZorgs: Array<{ href: string, identifier: string, rel: string, type: string }>;
    Description: string;
    Entity: string;
    HelpIdentifier: string;
    IsDismissed: boolean;
    Level: string;
    Link: { href: string, identifier: string, rel: string, type: string };
    Site: { href: string, identifier: string, rel: string, type: string };
    TurnedOn: Date;

    constructor()
    constructor(AffectedVpgs, AffectedZorgs, Description, Entity, HelpIdentifier, IsDismissed, Level, Link, Site, TurnedOn)
    

    static fromResponse(response: any): Alert
    static fromArrayResponse(array: any): Alert[]
}
