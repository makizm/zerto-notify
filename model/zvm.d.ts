export class Zvm {
    label: string;
    address: string;
    port: number;
    username: string;
    password: string;
    token: string;

    constructor()
    constructor(label, address, port, username, password, token)

    static fromConfig(config): Zvm[]
}
