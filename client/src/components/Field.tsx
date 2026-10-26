import { type ReactNode, useId } from 'react';

export interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface Props {
  label: string;
  error?: string;
  hint?: string;
  children: (props: FieldControlProps) => ReactNode;
}

/**
 * Etiqueta + campo + error/ayuda. El error va fuera del <label> y se enlaza con
 * aria-describedby: el lector de pantalla lee "Email" como nombre y el error como descripción.
 */
export function Field({ label, error, hint, children }: Props) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error ?? hint;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': note ? noteId : undefined })}
      {note && (
        <small id={noteId} className={error ? 'field__error' : 'muted'}>
          {note}
        </small>
      )}
    </div>
  );
}
