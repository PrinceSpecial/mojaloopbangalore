import { subscribeToPaymentProgress } from "~~/server/utils/paymentEvents";

export default defineEventHandler(async (event) => {
    const jobId = event.context.params?.jobId;

    if(!jobId) {
        throw new Error('Job ID is required');
    }
    
    setResponseHeaders(event, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    
    const stream = createEventStream(event);
    console.log('Client connected for jobId:', jobId, stream);

    const unsubscribe = subscribeToPaymentProgress(jobId, (data) => {
      stream.push({
        data: JSON.stringify(data)
      });
      console.log('Sent data:', data);
      
      if (data.status === 'completed') {
        stream.close();
      }
    });
    
    event.node.req.on('close', () => {
      unsubscribe();
      stream.close();
    });
    
    return stream.send();
  });