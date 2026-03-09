"use server";

import { checkPassword, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Введите пароль" };
  }

  if (!checkPassword(password)) {
    return { error: "Неверный пароль" };
  }

  await createSession();
  redirect("/");
}
