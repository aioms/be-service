// import { drizzle } from "drizzle-orm/postgres-js";
// import { seed } from "drizzle-seed";
// import { roleTable } from "../schemas/role.schema.ts";
//
// async function main() {
//   const db = drizzle(Deno.env.get("DATABASE_URL")!);
//   await seed(db, { roleTable }).refine((f: any) => {
//     return {
//       roles: {
//         count: 3,
//         columns: {
//           name: f.valuesFromArray({
//             values: ["supervisor", "admin", "user"],
//           }),
//         },
//       },
//     };
//   });
// }
// main();
