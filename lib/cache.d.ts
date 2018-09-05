import { Observable } from 'rxjs';
import { Message, Zvm, Alert } from '../model';

export class Cache {
    constructor()

    // Process new alert
    processNewAlerts(zvm: Zvm, newAlerts: Alert[]): void;

    // Subscribe to new messages
    messages(): Observable<Message>;

    // Compare new batch of alerts vs cached entries and remove any that no longer exist
    runCleanup(zvm: Zvm, newAlerts: Alert[]): void;
}
