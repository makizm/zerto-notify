import { Alert, Zvm } from '../model';

export class Store {
    constructor(zvms: Zvm[])

    /**
     * Add new alert
     * @param id Record index number
     * @param alert Alert Object
     */
    addAlert(id: number, alert: Alert): boolean;

    /**
     * Add new alert
     * @param zvm Zvm Object
     * @param alert Alert Object
     */
    addAlert(zvm: Zvm, alert: Alert): boolean;

    /**
     * Delete existing alert
     * @param id Record index number
     * @param alert Alert Object
     */
    removeAlert(id: number, alert: Alert): boolean;

    /**
     * Delete existing alert
     * @param zvm Zvm Object
     * @param alert Alert Object
     */
    removeAlert(zvm: Zvm, alert: Alert): boolean;

    /**
     * Delete all existing alerts
     * @param zvm Zvm Object
     */
    removeAllAlerts(zvm: Zvm): boolean;

    /**
     * Delete all existing alerts
     * @param id Record index number
     */
    removeAllAlerts(id: number): boolean;

    /**
     * Get all saved records
     */
    get(): [{ zvm: Zvm, alerts: [] }];

    /**
     * Get saved record
     * @param id Record index number
     */
    get(id: number): { zvm: Zvm, alerts: [] };

    /**
     * Get saved record
     * @param zvm Zvm Object
     */
    get(zvm: Zvm): { zvm: Zvm, alerts: [] };

    /**
     * Get saved Zvm alerts
     * @param id Record index number
     */
    getAlerts(id: number): Alert[];

    /**
     * Get saved Zvm alerts
     * @param zvm Zvm Object
     */
    getAlerts(zvm: Zvm): Alert[];


    /**
     * Find record index number for specified Zvm
     * @param zvm Zvm Object
     * @returns index or -1 when not present
     */
    findIndex(zvm: Zvm): number;

    /**
     * Find index for specified alert
     * @param id Record index number
     * @param alert Alert Object
     * @returns index or -1 when not present
     */
    findAlertIndex(id: number, alert: Alert): number;

    /**
     * Find index for specified alert
     * @param zvm Zvm Object
     * @param alert Alert Object
     * @returns index or -1 when not present
     */
    findAlertIndex(zvm: Zvm, alert: Alert): number;

    /**
     * Find saved alert
     */
    findAlert(zvm: Zvm, alert: Alert): (Alert | null);
    findAlert(id: number, alert: Alert): (Alert | null);

    /**
     * Check alert value is present
     * @param id Record index number
     * @param alert Alert Object
     */
    isAlertPresent(id: number, alert: Alert): boolean;

    /**
     * Check alert value is present
     * @param zvm Zvm Object
     * @param alert Alert Object
     */
    isAlertPresent(zvm: Zvm, alert: Alert): boolean;
}
