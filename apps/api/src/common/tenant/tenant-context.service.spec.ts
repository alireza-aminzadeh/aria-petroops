import { TenantContextService } from './tenant-context.service';

describe('TenantContextService', () => {
  it('returns null outside of any run() scope', () => {
    const svc = new TenantContextService();
    expect(svc.getTenantId()).toBeNull();
  });

  it('exposes the tenantId passed to run() from within the callback', () => {
    const svc = new TenantContextService();
    const seen = svc.run('tenant-1', () => svc.getTenantId());
    expect(seen).toBe('tenant-1');
  });

  it('survives async continuations started inside run()', async () => {
    const svc = new TenantContextService();
    const seen = await svc.run('tenant-async', async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return svc.getTenantId();
    });
    expect(seen).toBe('tenant-async');
  });

  it('does not leak between sequential/nested run() calls', () => {
    const svc = new TenantContextService();

    const outer = svc.run('tenant-outer', () => {
      const inner = svc.run('tenant-inner', () => svc.getTenantId());
      return { inner, afterInner: svc.getTenantId() };
    });

    expect(outer.inner).toBe('tenant-inner');
    // بعد از برگشت از run() تننت داخلی، context باید به تننت بیرونی برگردد.
    expect(outer.afterInner).toBe('tenant-outer');
    expect(svc.getTenantId()).toBeNull();
  });

  it('treats a null tenantId as "no context" (fail-open, not fail-closed)', () => {
    const svc = new TenantContextService();
    const seen = svc.run(null, () => svc.getTenantId());
    expect(seen).toBeNull();
  });

  it('runs two concurrent async scopes without cross-contamination', async () => {
    const svc = new TenantContextService();

    const delayed = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const [a, b] = await Promise.all([
      svc.run('tenant-a', async () => {
        await delayed(15);
        return svc.getTenantId();
      }),
      svc.run('tenant-b', async () => {
        await delayed(5);
        return svc.getTenantId();
      }),
    ]);

    expect(a).toBe('tenant-a');
    expect(b).toBe('tenant-b');
  });
});
