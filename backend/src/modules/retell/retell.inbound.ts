export interface RetellInboundPayload {
  event?: string;
  call_inbound?: {
    call_id?: unknown;
    from_number?: unknown;
    to_number?: unknown;
    destination_number?: unknown;
  };
  call_id?: unknown;
  from_number?: unknown;
  to_number?: unknown;
  destination_number?: unknown;
  [key: string]: unknown;
}

export interface RetellInboundCallFields {
  callId: string | null;
  fromNumber: string | null;
  destinationNumber: string | null;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function extractRetellInboundCall(payload: RetellInboundPayload): RetellInboundCallFields {
  const nested = payload.call_inbound || {};
  return {
    callId: stringValue(nested.call_id) || stringValue(payload.call_id),
    fromNumber: stringValue(nested.from_number) || stringValue(payload.from_number),
    destinationNumber: stringValue(nested.to_number)
      || stringValue(nested.destination_number)
      || stringValue(payload.to_number)
      || stringValue(payload.destination_number),
  };
}

export function describeRetellPayload(payload: unknown, maxDepth = 4): string[] {
  const paths: string[] = [];
  const visit = (value: unknown, path: string, depth: number) => {
    if (paths.length >= 100) return;
    if (value === null) {
      paths.push(`${path}:null`);
      return;
    }
    if (Array.isArray(value)) {
      paths.push(`${path}:array`);
      if (depth < maxDepth && value.length > 0) visit(value[0], `${path}[0]`, depth + 1);
      return;
    }
    if (typeof value !== 'object') {
      paths.push(`${path}:${typeof value}`);
      return;
    }
    paths.push(`${path}:object`);
    if (depth >= maxDepth) return;
    for (const [key, child] of Object.entries(value)) {
      visit(child, path ? `${path}.${key}` : key, depth + 1);
    }
  };
  visit(payload, '', 0);
  return paths;
}