"use client";
import { Loader2, MapPin } from "lucide-react";
import { INDIAN_STATES, cn } from "@/lib/utils";
import Field from "./Field";
import { usePincodeLookup } from "./hooks";

/**
 * Indian address fields with pincode → city/state auto-fill.
 * props: values, errors, set(name, value), prefix (id prefix), withPhone (adds a phone field)
 */
export default function AddressFields({ values, errors = {}, set, prefix = "addr", withPhone = false, serviceable = true }) {
  const lookup = usePincodeLookup(values.pincode, ({ city, state }) => {
    if (city) set("city", city);
    if (state) set("state", state);
  });
  const id = (n) => `${prefix}-${n}`;
  const bind = (n) => ({
    id: id(n),
    name: n,
    value: values[n] ?? "",
    onChange: (e) => set(n, e.target.value),
    error: errors[n],
  });

  return (
    <div className="grid grid-cols-6 gap-x-4 gap-y-5">
      <Field {...bind("name")} label="Full name" autoComplete="name" className="col-span-6" placeholder="As it should appear on the parcel" />
      {withPhone && (
        <Field
          {...bind("phone")}
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={14}
          prefix="+91"
          className="col-span-6"
        />
      )}
      <Field
        {...bind("pincode")}
        onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
        label="Pincode"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        className="col-span-6 sm:col-span-2"
        placeholder="6 digits"
        error={errors.pincode || (!serviceable && values.pincode?.length === 6 ? "We don't deliver to this pincode yet" : undefined)}
        suffix={
          lookup.status === "loading" ? (
            <Loader2 className="size-4 animate-spin text-mute" strokeWidth={1.5} aria-hidden />
          ) : lookup.status === "found" ? (
            <MapPin className="size-4 text-lume" strokeWidth={1.25} aria-hidden />
          ) : null
        }
      />
      <div className="col-span-6 flex items-end sm:col-span-4">
        <p
          aria-live="polite"
          className={cn(
            "mb-3.5 text-[12px] font-medium",
            lookup.status === "found" ? "text-lume" : "text-mute",
            lookup.status === "idle" && "hidden sm:block"
          )}
        >
          {lookup.status === "loading" && "Locating your pincode…"}
          {lookup.status === "found" && `Delivering to ${lookup.place}`}
          {lookup.status === "missing" && "Pincode not found — please fill city & state"}
          {lookup.status === "idle" && "City & state fill in automatically"}
        </p>
      </div>
      <Field
        {...bind("line1")}
        label="House / flat no., building, street"
        autoComplete="address-line1"
        className="col-span-6"
        placeholder="e.g. 12B, Palm Residency, MG Road"
      />
      <Field {...bind("line2")} label="Area / locality" optional autoComplete="address-line2" className="col-span-6 sm:col-span-3" />
      <Field {...bind("landmark")} label="Landmark" optional className="col-span-6 sm:col-span-3" placeholder="Near…" />
      <Field {...bind("city")} label="City / district" autoComplete="address-level2" className="col-span-6 sm:col-span-3" />
      <Field id={id("state")} label="State" error={errors.state} className="col-span-6 sm:col-span-3">
        <select
          id={id("state")}
          name="state"
          value={values.state ?? ""}
          onChange={(e) => set("state", e.target.value)}
          autoComplete="address-level1"
          aria-invalid={errors.state ? "true" : undefined}
          aria-describedby={`${id("state")}-error`}
          className={cn("field appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10", !values.state && "text-mute")}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23c9a96e' stroke-width='1.2'><path d='M2 4.5l4 4 4-4'/></svg>\")",
          }}
        >
          <option value="" disabled>
            Select state
          </option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s} className="bg-ink-2 text-bone">
              {s}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}
