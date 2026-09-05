import { setup, assign } from 'xstate';

export type WorkOrderContext = {
  workOrderId: string;
  assignedTo?: string;
  rejectionReason?: string;
};

export type WorkOrderEvent =
  | { type: 'ASSIGN'; technicianId: string }
  | { type: 'START' }
  | { type: 'SUBMIT_FOR_APPROVAL' }
  | { type: 'APPROVE' }
  | { type: 'REJECT'; reason: string }
  | { type: 'CLOSE' }
  | { type: 'CANCEL' };

export const workOrderMachine = setup({
  types: {
    context: {} as WorkOrderContext,
    events: {} as WorkOrderEvent,
    input: {} as { workOrderId: string },
  },
}).createMachine({
  id: 'workOrder',
  initial: 'draft',
  context: ({ input }) => ({
    workOrderId: input.workOrderId,
  }),
  states: {
    draft: {
      on: {
        ASSIGN: {
          target: 'assigned',
          actions: assign({
            assignedTo: ({ event }) => event.technicianId,
          }),
        },
        CANCEL: 'cancelled',
      },
    },
    assigned: {
      on: { START: 'inProgress', CANCEL: 'cancelled' },
    },
    inProgress: {
      on: { SUBMIT_FOR_APPROVAL: 'pendingApproval' },
    },
    pendingApproval: {
      on: {
        APPROVE: 'approved',
        REJECT: {
          target: 'inProgress',
          actions: assign({
            rejectionReason: ({ event }) => event.reason,
          }),
        },
      },
    },
    approved: {
      on: { CLOSE: 'closed' },
    },
    closed: { type: 'final' },
    cancelled: { type: 'final' },
  },
});
