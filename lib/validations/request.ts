import { z } from "zod";

export const requestCategories = [
  "medical",
  "education",
  "housing",
  "disaster_relief",
  "livelihood",
  "other",
] as const;

export const requestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(140, "Title must be under 140 characters"),
  category: z.enum(requestCategories, {
    errorMap: () => ({ message: "Choose a category" }),
  }),
  target_amount: z
    .coerce.number({ invalid_type_error: "Enter a numeric amount" })
    .positive("Target amount must be greater than 0")
    .max(10_000_000, "Target amount looks too large"),
  urgency: z.coerce
    .number()
    .int()
    .min(1, "Urgency must be between 1 and 5")
    .max(5, "Urgency must be between 1 and 5"),
  description: z
    .string()
    .trim()
    .min(20, "Please add at least 20 characters of detail")
    .max(4000, "Description must be under 4000 characters"),
  documents: z
    .custom<FileList | undefined>()
    .optional()
    .refine(
      (files) => !files || files.length <= 5,
      "You can attach up to 5 supporting documents"
    )
    .refine(
      (files) =>
        !files ||
        Array.from(files).every((f) => f.size <= 10 * 1024 * 1024),
      "Each document must be 10MB or smaller"
    ),
});

export type RequestFormValues = z.infer<typeof requestSchema>;
