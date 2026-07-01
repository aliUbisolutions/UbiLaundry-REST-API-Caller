import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function handleRequest(request: NextRequest) {
  const body = await request.json();
  const { url, method, headers: reqHeaders, body: reqBody, endpointId } = body as {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    endpointId?: string;
  };

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  // Enforce per-user allowed methods (set by proxy.ts via request header)
  const allowedMethods: string[] = JSON.parse(request.headers.get('x-user-methods') ?? '[]');
  if (allowedMethods.length > 0 && !allowedMethods.includes(method?.toUpperCase())) {
    return NextResponse.json(
      { error: `Method ${method} is not allowed for your account` },
      { status: 403 }
    );
  }

  // Enforce SOAP protocol access (detected via SOAPAction header)
  const isSoapCall = reqHeaders && Object.keys(reqHeaders).some(k => k.toLowerCase() === 'soapaction');
  if (isSoapCall && allowedMethods.length > 0 && !allowedMethods.includes('SOAP')) {
    return NextResponse.json(
      { error: 'SOAP calls are not allowed for your account' },
      { status: 403 }
    );
  }

  // Enforce per-user allowed endpoints
  const allowedEndpoints: string[] | 'all' = JSON.parse(request.headers.get('x-user-endpoints') ?? '"all"');
  if (endpointId && allowedEndpoints !== 'all' && !allowedEndpoints.includes(endpointId)) {
    return NextResponse.json(
      { error: 'This endpoint is not available for your account' },
      { status: 403 }
    );
  }

  const fetchOptions: RequestInit = {
    method,
    headers: reqHeaders,
  };

  if (reqBody && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = reqBody;
  }

  const startTime = Date.now();
  let response: Response;

  try {
    response = await fetch(url, fetchOptions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Network error: ${message}` }, { status: 502 });
  }

  const elapsed = Date.now() - startTime;
  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  const contentType = response.headers.get('content-type') ?? '';
  let responseBody: unknown;

  if (contentType.includes('application/json')) {
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text();
    }
  } else {
    responseBody = await response.text();
  }

  return NextResponse.json({
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
    body: responseBody,
    elapsed,
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
