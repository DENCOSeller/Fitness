"use server";

import { registerUser, createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function registerAction(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");

  if (typeof email !== "string" || email.length === 0) {
    return { error: "Введите email" };
  }

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Введите пароль" };
  }

  if (password.length < 4) {
    return { error: "Пароль слишком короткий (мин. 4 символа)" };
  }

  const result = await registerUser(
    email,
    password,
    typeof name === "string" ? name : undefined
  );

  if (result.error) {
    return { error: result.error };
  }

  await createSession(result.user!.id);
  redirect("/onboarding");
}
