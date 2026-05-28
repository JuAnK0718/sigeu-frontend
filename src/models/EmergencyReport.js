import { getEmergencyPriority, parseEmergencyCoordinates } from '../utils/emergencies';

export class EmergencyReport {
  constructor(data = {}, viewerRole = null) {
    this.id = data.id ?? null;
    this.title = data.title || '';
    this.description = data.description || '';
    this.location = data.location || '';
    this.type = data.type || '';
    this.status = data.status || 'PENDING';
    this.targetEntity = data.targetEntity || '';
    this.reporterUsername = data.reporterUsername || '';
    this.assignedOperatorUsername = data.assignedOperatorUsername || '';
    this.image = data.image || '';
    this.createdAt = data.createdAt || null;
    this.assignedUnits = data.assignedUnits ?? 0;
    this.resourceLabel = data.resourceLabel || '';
    this.estimatedResolveMinutes = data.estimatedResolveMinutes ?? null;
    this.operationalNote = data.operationalNote || '';
    this.autoStartedAt = data.autoStartedAt || null;
    this.autoResolveAt = data.autoResolveAt || null;
    this.autoDeleteAt = data.autoDeleteAt || null;
    this.resolvedAt = data.resolvedAt || null;
    this.deleteReason = data.deleteReason || '';
    this.viewerRole = viewerRole;
  }

  static fromApi(data, viewerRole) {
    if (!data) return null;
    return new EmergencyReport(data, viewerRole);
  }

  static collection(items, viewerRole) {
    if (!Array.isArray(items)) return [];
    return items.map(item => EmergencyReport.fromApi(item, viewerRole));
  }

  get coordinates() {
    return parseEmergencyCoordinates(this.location);
  }

  get priority() {
    return getEmergencyPriority(this, this.viewerRole);
  }

  get hasImage() {
    return Boolean(this.image);
  }

  get hasMap() {
    return Boolean(this.coordinates);
  }

  get isInProgress() {
    return this.status === 'IN_PROGRESS';
  }

  get isResolved() {
    return this.status === 'RESOLVED';
  }

  get isWaiting() {
    return this.status === 'WAITING';
  }

  get isPending() {
    return this.status === 'PENDING';
  }

  get searchText() {
    return `${this.title} ${this.description} ${this.location} ${this.type} ${this.operationalNote}`.toLowerCase();
  }

  matchesSearch(searchTerm) {
    const normalizedTerm = String(searchTerm || '').trim().toLowerCase();
    return !normalizedTerm || this.searchText.includes(normalizedTerm);
  }

  matchesFilter(filterId) {
    if (filterId === 'ALL') return true;
    if (filterId === 'HIGH') return this.priority.level >= 3;
    if (filterId === 'IMAGE') return this.hasImage;
    if (filterId === 'MAP') return this.hasMap;
    return this.status === filterId;
  }

}

export class EmergencyDashboard {
  constructor(items = [], viewerRole = null) {
    this.items = EmergencyReport.collection(items, viewerRole);
  }

  get stats() {
    return {
      total: this.items.length,
      pending: this.items.filter(item => item.isPending).length,
      waiting: this.items.filter(item => item.isWaiting).length,
      progress: this.items.filter(item => item.isInProgress).length,
      resolved: this.items.filter(item => item.isResolved).length,
      high: this.items.filter(item => item.priority.level >= 3).length,
      image: this.items.filter(item => item.hasImage).length,
      map: this.items.filter(item => item.hasMap).length,
    };
  }

  filter(searchTerm, filterId) {
    return this.items.filter(item => item.matchesSearch(searchTerm) && item.matchesFilter(filterId));
  }

  groupByStatus(searchTerm, filterId) {
    const filteredItems = this.filter(searchTerm, filterId);

    return {
      PENDING: filteredItems.filter(item => item.isPending),
      WAITING: filteredItems.filter(item => item.isWaiting),
      IN_PROGRESS: filteredItems.filter(item => item.isInProgress),
      RESOLVED: filteredItems.filter(item => item.isResolved),
    };
  }
}
