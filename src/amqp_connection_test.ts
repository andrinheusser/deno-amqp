import { AmqpConnection } from "./amqp_connection.ts";
import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.92.0/testing/asserts.ts";
import { handleWrite, matchMethod, MockConn } from "./mock_conn.ts";
import { encodeFrame } from "./amqp_socket.ts";

const textEncoder = new TextEncoder();

function concatArray(arr1: Iterable<number>, arr2: Iterable<number>) {
  return Uint8Array.from([...arr1, ...arr2]);
}

Deno.test("open and close connection", async () => {
  const conn = new MockConn();
  const amqp = new AmqpConnection(conn, {
    loglevel: "none",
    password: "pass",
    username: "u",
  });

  await amqp.open();

  assertEquals(
    conn.write.mock.calls[0][0],
    concatArray(textEncoder.encode("AMQP"), [0, 0, 9, 1]),
  );

  await amqp.close();
  assertEquals(conn.close.mock.calls.length, 1);
});

Deno.test("open connection with failed connection.open handshake", async () => {
  const conn = new MockConn();
  const amqp = new AmqpConnection(conn, {
    loglevel: "none",
    password: "pass",
    username: "u",
  });

  conn.handleWrite = (p: Uint8Array): Uint8Array | null => {
    if (matchMethod(p, 10, 40)) {
      return encodeFrame({
        channel: 0,
        type: "method",
        payload: {
          classId: 10,
          methodId: 50,
          args: {
            classId: 10,
            methodId: 40,
            replyCode: 400,
            replyText: "Bad request",
          },
        },
      });
    }

    if (matchMethod(p, 10, 51)) {
      return null;
    }

    return handleWrite(p);
  };

  const error = await amqp.open().catch((e) => e);

  assert(error instanceof Error);
  assertEquals(
    error.message,
    "Connection closed by server - 400 Bad request - caused by 'connection.open'",
  );

  // Last message should be close.ok
  assertEquals(
    conn.write.mock.calls[conn.write.mock.calls.length - 1][0],
    encodeFrame({
      type: "method",
      channel: 0,
      payload: { classId: 10, methodId: 51, args: {} },
    }),
  );
});
