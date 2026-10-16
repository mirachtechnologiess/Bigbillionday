"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Field from "@/components/commerce/Field";

/** Password field with show/hide toggle. */
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);
  return (
    <Field
      {...props}
      type={show ? "text" : "password"}
      suffix={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="grid size-9 place-items-center rounded-full text-mute transition hover:text-gold-2"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="size-4" strokeWidth={1.25} /> : <Eye className="size-4" strokeWidth={1.25} />}
        </button>
      }
    />
  );
}
