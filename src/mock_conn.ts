import { encodeFrame } from "./amqp_socket.ts";
import { mock } from "./mock.ts";

const textEncoder = new TextEncoder();

function matchPattern(
  source: Uint8Array,
  target: Uint8Array,
  from = 0,
) {
  for (let i = 0; i < target.length; ++i) {
    if (source[i + from] !== target[i]) {
      return false;
    }
  }

  return true;
}

export function matchMethod(
  source: Uint8Array,
  classId: number,
  methodId: number,
) {
  return matchPattern(source, new Uint8Array([0, classId, 0, methodId]), 7);
}

function copy(source: Uint8Array, target: Uint8Array): number {
  let i = 0;

  for (i = 0; i < Math.min(target.length, source.length); ++i) {
    target[i] = source[i];
  }

  return i;
}

export function handleWrite(p: Uint8Array): Uint8Array | null {
  if (matchPattern(p, textEncoder.encode("AMQP"))) {
    return encodeFrame({
      channel: 0,
      type: "method",
      payload: { classId: 10, methodId: 10, args: { serverProperties: {} } },
    });
  }

  if (matchMethod(p, 10, 11)) {
    return encodeFrame({
      channel: 0,
      type: "method",
      payload: { classId: 10, methodId: 30, args: {} },
    });
  }

  if (matchMethod(p, 10, 40)) {
    return encodeFrame({
      channel: 0,
      type: "method",
      payload: { classId: 10, methodId: 41, args: {} },
    });
  }

  if (matchMethod(p, 10, 50)) {
    return encodeFrame({
      channel: 0,
      type: "method",
      payload: { classId: 10, methodId: 51, args: {} },
    });
  }

  return new Uint8Array(0);
}

export class MockConn implements Deno.Conn {
  localAddr: Deno.Addr;
  remoteAddr: Deno.Addr;
  rid: number;

  data: Uint8Array | null;

  constructor() {
    this.localAddr = { hostname: "", port: 0, transport: "tcp" };
    this.remoteAddr = { hostname: "", port: 0, transport: "tcp" };
    this.rid = 0;
    this.data = new Uint8Array(0);
  }

  closeWrite = mock.fn();

  read = mock.fn((p: Uint8Array) => {
    const data = this.data;

    if (data) {
      const size = copy(data, p);
      this.data = data.subarray(size);
      return Promise.resolve(size);
    }

    return Promise.resolve(null);
  });

  write = mock.fn((p: Uint8Array) => {
    this.data = this.handleWrite(p);

    return Promise.resolve(p.length);
  });

  close = mock.fn(() => {
    this.data = null;
  });

  handleWrite = handleWrite;
}
