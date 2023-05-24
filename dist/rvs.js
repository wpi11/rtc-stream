import { start } from "./server.js";

start()
  .then(() => console.log("successfully launched stream server."))
  .catch(() => console.log("failed to launch stream server."));
