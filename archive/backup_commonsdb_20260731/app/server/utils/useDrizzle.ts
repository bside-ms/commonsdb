import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

import * as schema from "../database/schema";

const useDrizzle = drizzlePg(process.env.DATABASE_URL ?? "", {
  schema,
});

export default useDrizzle;
