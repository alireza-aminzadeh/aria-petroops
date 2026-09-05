/**
 * Read-only OPC-UA client. Never writes to the server/session.
 * node-opcua is optional: npm install node-opcua in this folder to enable.
 */
export async function startOpcua(publish) {
  const endpoint = process.env.OPCUA_ENDPOINT_URL;
  if (!endpoint) {
    return { mode: 'disabled' };
  }

  let opcua;
  try {
    opcua = await import('node-opcua');
  } catch {
    console.warn('OPC-UA requested but node-opcua is not installed; staying on simulator');
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
    connectionStrategy: { maxRetry: 20, initialDelay: 2000 },
  });
  await client.connect(endpoint);
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

  console.log(`OPC-UA subscribed read-only at ${endpoint} (${nodeIds.length} nodes)`);
  return { mode: 'opcua', client, session };
}
