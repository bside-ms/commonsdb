// https://github.com/prisma/prisma/issues/15614#issuecomment-2813214675
import type { PrismaClient as ImportedPrismaClient } from "@prisma/client";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PrismaClient: RequiredPrismaClient } = require("@prisma/client");

const _PrismaClient: typeof ImportedPrismaClient = RequiredPrismaClient;

export class PrismaClient extends _PrismaClient {}

const prisma = new PrismaClient();

export default prisma;

// // https://github.com/prisma/prisma/issues/15614#issuecomment-2813214675
// import type { PrismaClient as ImportedPrismaClient } from "@prisma/client";
// import { createRequire } from "module";

// const require = createRequire(import.meta.url);
// const { PrismaClient: RequiredPrismaClient } = require("@prisma/client");

// const _PrismaClient: typeof ImportedPrismaClient = RequiredPrismaClient;

// const prisma = new _PrismaClient();

// export default prisma;

// https://github.com/prisma/prisma/issues/15614#issuecomment-2813214675
// import type { PrismaClient as ImportedPrismaClient } from "@/generated/prisma/client";
// import { createRequire } from "module";

// const require = createRequire(import.meta.url);
// const {
//   PrismaClient: RequiredPrismaClient,
// } = require("@/generated/prisma/client");

// const _PrismaClient: typeof ImportedPrismaClient = RequiredPrismaClient;

// const prisma = new _PrismaClient();

// export default prisma;

// import { PrismaClient } from "@/generated/prisma/client";

// const prisma = new PrismaClient();

// export default prisma;
