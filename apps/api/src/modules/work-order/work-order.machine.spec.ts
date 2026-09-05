import { createActor } from 'xstate';
import { workOrderMachine } from './work-order.machine';
import { availableEvents, hydrateWorkOrder } from './work-order.runtime';

describe('workOrderMachine', () => {
  function start() {
    return createActor(workOrderMachine, {
      input: { workOrderId: 'wo-1' },
    }).start();
  }

  it('starts in draft and rejects APPROVE', () => {
    const actor = start();
    expect(actor.getSnapshot().matches('draft')).toBe(true);
    expect(actor.getSnapshot().can({ type: 'APPROVE' })).toBe(false);
    actor.stop();
  });

  it('walks draft → assigned → inProgress → pendingApproval → approved → closed', () => {
    const actor = start();
    const techId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

    expect(actor.getSnapshot().can({ type: 'ASSIGN', technicianId: techId })).toBe(
      true,
    );
    actor.send({ type: 'ASSIGN', technicianId: techId });
    expect(actor.getSnapshot().matches('assigned')).toBe(true);

    actor.send({ type: 'START' });
    expect(actor.getSnapshot().matches('inProgress')).toBe(true);

    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    expect(actor.getSnapshot().matches('pendingApproval')).toBe(true);

    actor.send({ type: 'APPROVE' });
    expect(actor.getSnapshot().matches('approved')).toBe(true);

    actor.send({ type: 'CLOSE' });
    expect(actor.getSnapshot().matches('closed')).toBe(true);
    actor.stop();
  });

  it('returns REJECT back to inProgress', () => {
    const actor = start();
    actor.send({
      type: 'ASSIGN',
      technicianId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    });
    actor.send({ type: 'START' });
    actor.send({ type: 'SUBMIT_FOR_APPROVAL' });
    actor.send({ type: 'REJECT', reason: 'کار ناقص است' });
    expect(actor.getSnapshot().matches('inProgress')).toBe(true);
    expect(actor.getSnapshot().context.rejectionReason).toBe('کار ناقص است');
    actor.stop();
  });
});

describe('workOrder persist snapshot', () => {
  it('rehydrates mid-flow and continues to closed', () => {
    const techId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    const first = hydrateWorkOrder('wo-persist');
    first.send({ type: 'ASSIGN', technicianId: techId });
    first.send({ type: 'START' });
    const snapshot = first.getPersistedSnapshot();
    first.stop();

    const second = hydrateWorkOrder('wo-persist', snapshot);
    expect(second.getSnapshot().matches('inProgress')).toBe(true);
    expect(availableEvents('wo-persist', snapshot)).toEqual(
      expect.arrayContaining(['SUBMIT_FOR_APPROVAL']),
    );
    second.send({ type: 'SUBMIT_FOR_APPROVAL' });
    second.send({ type: 'APPROVE' });
    second.send({ type: 'CLOSE' });
    expect(second.getSnapshot().matches('closed')).toBe(true);
    second.stop();
  });
});
