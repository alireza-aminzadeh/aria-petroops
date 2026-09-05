import { SafeopsIntegrationService } from './safeops-integration.service';

describe('SafeopsIntegrationService.isEnabled', () => {
  it('requires enabled flag, url and api key', () => {
    const config = {
      get: (key: string) => {
        if (key === 'SAFEOPS_ENABLED') return 'true';
        if (key === 'SAFEOPS_API_URL') return 'https://hse.aria-ai.ir';
        if (key === 'SAFEOPS_API_KEY') return 'secret';
        return undefined;
      },
    };
    const service = new SafeopsIntegrationService({} as never, config as never);
    expect(service.isEnabled()).toBe(true);
  });

  it('stays off without an api key', () => {
    const config = {
      get: (key: string) => {
        if (key === 'SAFEOPS_ENABLED') return 'true';
        if (key === 'SAFEOPS_API_URL') return 'https://hse.aria-ai.ir';
        return undefined;
      },
    };
    const service = new SafeopsIntegrationService({} as never, config as never);
    expect(service.isEnabled()).toBe(false);
  });
});
