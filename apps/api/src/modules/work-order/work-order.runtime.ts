import { createActor } from 'xstate';
import { workOrderMachine, WorkOrderEvent } from './work-order.machine';

export function hydrateWorkOrder(
  workOrderId: string,
  snapshot?: unknown,
) {
  return createActor(workOrderMachine, {
    input: { workOrderId },
    snapshot: snapshot as never,
  }).start();
}

export function availableEvents(workOrderId: string, snapshot?: unknown) {
  const actor = hydrateWorkOrder(workOrderId, snapshot);
  const events: WorkOrderEvent['type'][] = [
    'ASSIGN',
    'START',
    'SUBMIT_FOR_APPROVAL',
    'APPROVE',
    'REJECT',
    'CLOSE',
    'CANCEL',
  ];
  const can = events.filter((type) => {
    if (type === 'ASSIGN') {
      return actor.getSnapshot().can({ type, technicianId: '00000000-0000-0000-0000-000000000000' });
    }
    if (type === 'REJECT') {
      return actor.getSnapshot().can({ type, reason: 'placeholder' });
    }
    return actor.getSnapshot().can({ type } as WorkOrderEvent);
  });
  actor.stop();
  return can;
}
