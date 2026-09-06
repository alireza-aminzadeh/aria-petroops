/**
 * Read-only OPC-UA client. Never writes to the server/session.
 *
 * Uses `node-opcua-client` (the lightweight client-only sub-package, not the
 * full `node-opcua` meta-package which also bundles server code) — this
 * container only ever subscribes/reads, and keeps the image smaller/faster
 * to start, which matters given the 96M memory limit on this service in
 * docker-compose.yml. It's a real `dependencies` entry now (see package.json)
 * so this path actually works in production, not just the simulator.
 */
export async function startOpcua(publish) {
  const endpoint = process.env.OPCUA_ENDPOINT_URL;
  if (!endpoint) {
    return { mode: 'disabled' };
  }

  let opcua;
  try {
    opcua = await import('node-opcua-client');
  } catch {
    console.warn('OPC-UA requested but node-opcua-client is not installed; staying on simulator');
    return { mode: 'missing-library' };
  }

  const map = JSON.parse(process.env.OPCUA_NODE_MAP ?? '{}');
  const nodeIds = Object.entries(map);
  if (nodeIds.length === 0) {
    console.warn('OPCUA_NODE_MAP is empty JSON; nothing to subscribe');
    return { mode: 'no-map' };
  }

  const client = opcua.OPCUAClient.create({
    endpointMustExist: false,
    // maxRetry کوچک نگه داشته شده تا اگر سرور OPC-UA در لحظهٔ استارت edge agent
    // در دسترس نباشد، طولانی (چند دقیقه با backoff داخلی node-opcua) بلاک
    // نشویم؛ بعد از reconnect موفق، همین connectionStrategy برای افت‌های بعدی
    // (connection_lost) هم به کار می‌رود که برای آن مقادیر کوچک کافی است چون
    // node-opcua خودش پشت‌سرهم تلاش می‌کند.
    connectionStrategy: { maxRetry: 5, initialDelay: 1000, maxDelay: 5000 },
    // این کلاینت فقط پشت شبکهٔ OT ایزوله (طبق docs/07-security.md) و فقط برای
    // subscribe/read استفاده می‌شود؛ None ساده‌ترین/سبک‌ترین حالت است و از
    // پیچیدگی/شکست تولید و مدیریت گواهی (PKI) داخل کانتینر non-root جلوگیری
    // می‌کند. اگر سرور OPC-UA هدف امنیت پیام را الزامی کند، این مقادیر باید
    // به‌همراه یک PKI volume نوشتنی به‌روزرسانی شوند.
    securityMode: opcua.MessageSecurityMode.None,
    securityPolicy: opcua.SecurityPolicy.None,
  });

  // اگر سرور OPC-UA واقعی در دسترس نباشد (پیکربندی اشتباه، شبکه قطع، سرور
  // پایین)، نباید کل edge agent کرش کند یا استارت را طولانی بلاک کند — باید
  // در یک بازهٔ محدود به شبیه‌ساز برگردد، دقیقاً مثل حالت «کتابخانه نصب نیست».
  // سقف زمانی صریح (علاوه‌بر connectionStrategy) چون منطق backoff داخلی
  // کتابخانه ممکن است در عمل بیشتر از انتظار طول بکشد.
  const CONNECT_TIMEOUT_MS = 20_000;
  try {
    await Promise.race([
      client.connect(endpoint),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`connect timed out after ${CONNECT_TIMEOUT_MS}ms`)), CONNECT_TIMEOUT_MS),
      ),
    ]);
  } catch (error) {
    console.warn(`OPC-UA connect failed (${error.message}); staying on simulator`);
    await client.disconnect().catch(() => {});
    return { mode: 'connect-failed' };
  }

  const session = await client.createSession();
  const subscription = await session.createSubscription2({
    requestedPublishingInterval: 1000,
    requestedLifetimeCount: 100,
    requestedMaxKeepAliveCount: 10,
    maxNotificationsPerPublish: 50,
    publishingEnabled: true,
    priority: 1,
  });

  for (const [tag, nodeId] of nodeIds) {
    const item = await subscription.monitor(
      {
        nodeId,
        attributeId: opcua.AttributeIds.Value,
      },
      { samplingInterval: 1000, discardOldest: true, queueSize: 10 },
      opcua.TimestampsToReturn.Both,
    );
    item.on('changed', (dataValue) => {
      const value = Number(dataValue.value?.value);
      if (!Number.isFinite(value)) return;
      publish({
        tag,
        ts: (dataValue.sourceTimestamp ?? new Date()).toISOString(),
        value,
        quality: dataValue.statusCode?.isGood?.() ? 0 : 1,
      });
    });
  }

  client.on('connection_lost', () => console.warn('OPC-UA connection lost; node-opcua will auto-retry'));
  client.on('connection_reestablished', () => console.log('OPC-UA connection re-established'));

  console.log(`OPC-UA subscribed read-only at ${endpoint} (${nodeIds.length} nodes)`);
  return { mode: 'opcua', client, session };
}
