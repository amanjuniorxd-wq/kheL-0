"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { requestSchema, requestCategories, type RequestFormValues } from "@/lib/validations/request";
import { createRequest, type CreateRequestState } from "./actions";

const STEPS = ["Basics", "Funding", "Description", "Documents"] as const;

const initialState: CreateRequestState = {};

export default function RequestForm() {
  const [step, setStep] = useState(0);
  const [formState, formAction] = useFormState(createRequest, initialState);

  const {
    register,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    mode: "onBlur",
    defaultValues: { urgency: 3 },
  });

  const stepFields: Record<number, (keyof RequestFormValues)[]> = {
    0: ["title", "category"],
    1: ["target_amount", "urgency"],
    2: ["description"],
    3: ["documents"],
  };

  async function next() {
    const valid = await trigger(stepFields[step]);
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="card">
      <ol className="mb-6 flex gap-2 text-xs font-medium text-neutral-500">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={clsx(
              "flex-1 rounded-full py-1 text-center",
              i === step
                ? "bg-brand-600 text-white"
                : i < step
                ? "bg-brand-100 text-brand-700"
                : "bg-neutral-100"
            )}
          >
            {label}
          </li>
        ))}
      </ol>

      {formState.error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {formState.error}
        </p>
      )}

      {/* The real submission goes through the server action's <form>, so we
          keep all fields mounted (hidden via CSS, not unmounted) across
          steps and gate visibility client-side with react-hook-form. */}
      <form action={formAction} className="space-y-5">
        <div className={clsx(step !== 0 && "hidden")}>
          <Field label="Title" error={errors.title?.message}>
            <input {...register("title")} className="input" placeholder="Help rebuilding after flood damage" />
          </Field>
          <Field label="Category" error={errors.category?.message}>
            <select {...register("category")} className="input">
              <option value="">Choose a category</option>
              {requestCategories.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className={clsx(step !== 1 && "hidden")}>
          <Field label="Target amount (₹)" error={errors.target_amount?.message}>
            <input
              type="number"
              min={1}
              step="0.01"
              {...register("target_amount")}
              className="input"
            />
          </Field>
          <Field label={`Urgency: ${watch("urgency") ?? 3} / 5`} error={errors.urgency?.message}>
            <input type="range" min={1} max={5} {...register("urgency")} className="w-full" />
          </Field>
        </div>

        <div className={clsx(step !== 2 && "hidden")}>
          <Field label="Description" error={errors.description?.message}>
            <textarea
              rows={6}
              {...register("description")}
              className="input"
              placeholder="Explain the situation, who it affects, and how the funds will be used."
            />
          </Field>
        </div>

        <div className={clsx(step !== 3 && "hidden")}>
          <Field label="Supporting documents (optional, up to 5)" error={errors.documents?.message as string | undefined}>
            <input type="file" multiple {...register("documents")} className="input" />
          </Field>
          <Review values={getValues()} />
        </div>

        <div className="flex justify-between pt-2">
          {step > 0 ? (
            <button type="button" onClick={back} className="btn-secondary">
              Back
            </button>
          ) : (
            <span />
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary">
              Continue
            </button>
          ) : (
            <SubmitButton />
          )}
        </div>
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Submitting…" : "Submit request"}
    </button>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function Review({ values }: { values: RequestFormValues }) {
  return (
    <div className="mt-4 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-600">
      <p className="font-medium text-neutral-800">Review</p>
      <p>{values.title || "—"}</p>
      <p>
        {values.category || "—"} · ₹{values.target_amount || 0} · urgency {values.urgency ?? "—"}
      </p>
    </div>
  );
}
