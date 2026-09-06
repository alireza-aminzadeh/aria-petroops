import { CallHandler, ExecutionContext } from '@nestjs/common';
import { from, of } from 'rxjs';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { TenantContextService } from './tenant-context.service';

function createHttpContext(user?: { tenantId: string }): ExecutionContext {
  const request = { user };
  return {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
      getNext: () => undefined,
    }),
  } as unknown as ExecutionContext;
}

function createNonHttpContext(): ExecutionContext {
  return {
    getType: () => 'rpc',
    switchToHttp: () => {
      throw new Error('switchToHttp نباید برای context غیر HTTP صدا زده شود');
    },
  } as unknown as ExecutionContext;
}

describe('TenantContextInterceptor', () => {
  it('runs the handler within the tenantId taken from request.user (HTTP)', (done) => {
    const tenantContext = new TenantContextService();
    const interceptor = new TenantContextInterceptor(tenantContext);
    const context = createHttpContext({ tenantId: 'tenant-http-1' });

    let seenInsideHandler: string | null = 'NOT_SET';
    const handler: CallHandler = {
      handle: () => {
        seenInsideHandler = tenantContext.getTenantId();
        return of('ok');
      },
    };

    interceptor.intercept(context, handler).subscribe({
      next: (value) => {
        expect(value).toBe('ok');
        expect(seenInsideHandler).toBe('tenant-http-1');
      },
      complete: () => done(),
      error: done,
    });
  });

  it('runs with a null tenantId when request.user is missing (public routes)', (done) => {
    const tenantContext = new TenantContextService();
    const interceptor = new TenantContextInterceptor(tenantContext);
    const context = createHttpContext(undefined);

    let seenInsideHandler: string | null = 'NOT_SET';
    const handler: CallHandler = {
      handle: () => {
        seenInsideHandler = tenantContext.getTenantId();
        return of('ok');
      },
    };

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(seenInsideHandler).toBeNull();
        done();
      },
      error: done,
    });
  });

  it('passes through untouched for non-HTTP execution contexts (e.g. WS gateway)', (done) => {
    const tenantContext = new TenantContextService();
    const interceptor = new TenantContextInterceptor(tenantContext);
    const context = createNonHttpContext();

    const handler: CallHandler = {
      handle: () => of('ws-result'),
    };

    interceptor.intercept(context, handler).subscribe({
      next: (value) => expect(value).toBe('ws-result'),
      complete: () => done(),
      error: done,
    });
  });

  it('propagates context through an async (macrotask-delayed) handler too', (done) => {
    const tenantContext = new TenantContextService();
    const interceptor = new TenantContextInterceptor(tenantContext);
    const context = createHttpContext({ tenantId: 'tenant-delayed' });

    let seenInsideHandler: string | null = 'NOT_SET';
    const handler: CallHandler = {
      handle: () =>
        from(
          (async () => {
            await new Promise((resolve) => setTimeout(resolve, 5));
            seenInsideHandler = tenantContext.getTenantId();
            return 'delayed-ok';
          })(),
        ),
    };

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(seenInsideHandler).toBe('tenant-delayed');
        done();
      },
      error: done,
    });
  });
});
