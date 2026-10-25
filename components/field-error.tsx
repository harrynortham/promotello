// The message under a field that failed validation. Give the input
// aria-invalid and aria-describedby={id} so screen readers announce it.
export function FieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null;

    return (
        <p id={id} role="alert" className="text-sm text-destructive">
            {message}
        </p>
    );
}

// aria props for an input with an optional error, e.g.
// <Input {...register("email")} {...invalidProps("email-error", errors.email)} />
export function invalidProps(id: string, error?: { message?: string }) {
    return error ? { "aria-invalid": true as const, "aria-describedby": id } : {};
}
