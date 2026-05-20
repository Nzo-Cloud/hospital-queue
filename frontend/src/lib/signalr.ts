import * as signalR from "@microsoft/signalr";

const SIGNALR_URL =
  process.env.NEXT_PUBLIC_SIGNALR_URL ?? "http://localhost:8080/hubs/queue";

let connection: signalR.HubConnection | null = null;

export function getSignalRConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(SIGNALR_URL, {
      // Send JWT in query string for WebSocket (headers not supported in WS)
      accessTokenFactory: () => {
        return localStorage.getItem("accessToken") ?? "";
      },
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // backoff schedule
    .configureLogging(
      process.env.NODE_ENV === "development"
        ? signalR.LogLevel.Information
        : signalR.LogLevel.Warning
    )
    .build();

  connection.onreconnecting(() => {
    console.warn("[SignalR] Reconnecting...");
  });

  connection.onreconnected(() => {
    console.info("[SignalR] Reconnected.");
  });

  connection.onclose((err) => {
    if (err) console.error("[SignalR] Connection closed with error:", err);
  });

  return connection;
}

export async function startSignalR(): Promise<signalR.HubConnection> {
  const conn = getSignalRConnection();
  if (conn.state === signalR.HubConnectionState.Disconnected) {
    await conn.start();
  }
  return conn;
}

export async function stopSignalR(): Promise<void> {
  if (connection?.state === signalR.HubConnectionState.Connected) {
    await connection.stop();
    connection = null;
  }
}
