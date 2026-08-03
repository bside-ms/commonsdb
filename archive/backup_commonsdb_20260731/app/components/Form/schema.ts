import { z } from "zod";

export const linkListSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  url: z.string().url(),
});
