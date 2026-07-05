// Thrown instead of a plain network-failure Error when a mutation could be
// (and was) queued for automatic retry. Callers should catch this
// specifically to show "saved offline, will sync" instead of a hard failure.
export class OfflineQueuedError extends Error {
  queueId: number;

  constructor(queueId: number) {
    super('You are offline — this will be sent automatically once you reconnect.');
    this.name = 'OfflineQueuedError';
    this.queueId = queueId;
  }
}
