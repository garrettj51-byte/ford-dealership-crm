"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/lib/types";

export function useServerAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run<T>(
    action: () => Promise<ActionResult<T>>,
    options?: {
      success?: string | ((data: T) => string);
      onSuccess?: (data: T) => void;
      refresh?: boolean;
    },
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (options?.refresh !== false) {
        router.refresh();
      }
      if (options?.success) {
        toast.success(
          typeof options.success === "function"
            ? options.success(result.data)
            : options.success,
        );
      }
      options?.onSuccess?.(result.data);
    });
  }

  return { pending, run };
}
