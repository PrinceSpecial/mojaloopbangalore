import { EventEmitter } from 'events';

class PaymentEventManager extends EventEmitter {
  private static instance: PaymentEventManager;

  static getInstance() {
    if (!this.instance) {
      this.instance = new PaymentEventManager();
    }
    return this.instance;
  }
}

export const paymentEvents = PaymentEventManager.getInstance();

export function emitPaymentProgress(jobId: string, data: any) {
  paymentEvents.emit(jobId, data);
}

export function subscribeToPaymentProgress(
  jobId: string, 
  callback: (data: any) => void
) {
  paymentEvents.on(jobId, callback);
  
  return () => {
    paymentEvents.off(jobId, callback);
  };
}