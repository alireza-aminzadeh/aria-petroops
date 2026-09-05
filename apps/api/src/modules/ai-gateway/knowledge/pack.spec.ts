import { retrieveKnowledge } from './pack';

describe('knowledge pack', () => {
  it('finds ISA-18.2 material for alarm queries', () => {
    const docs = retrieveKnowledge('نرخ آلارم flood chattering');
    expect(docs[0].id).toBe('isa-18-2');
  });
});
