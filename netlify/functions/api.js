import serverless from "serverless-http";
import { app, connectDatabase } from "../../server/index.js";

const expressHandler = serverless(app, { binary: ["image/*", "video/*", "application/pdf", "application/octet-stream"] });

export async function handler(event, context) {
  try {
    await connectDatabase();
    return await expressHandler(event, context);
  } catch (error) {
    return { statusCode: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: error.message }) };
  }
}
