import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Confirmation = { title: string; message: string; action: string };
type Confirm = (options: Confirmation) => Promise<boolean>;
const Context = createContext<Confirm | null>(null);

export function useConfirm() {
  const confirm = useContext(Context);
  if (!confirm) throw new Error("Confirmation provider is missing.");
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<Confirmation | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const resolve = useRef<((answer: boolean) => void) | null>(null);
  function finish(answer: boolean) {
    dialog.current?.close();
    resolve.current?.(answer);
    resolve.current = null;
    setOptions(null);
  }
  useEffect(() => {
    if (options) dialog.current?.showModal();
  }, [options]);
  useEffect(
    () => () => {
      resolve.current?.(false);
    },
    [],
  );
  return (
    <Context.Provider
      value={(next) => {
        if (resolve.current) return Promise.resolve(false);
        return new Promise<boolean>((done) => {
          resolve.current = done;
          setOptions(next);
        });
      }}
    >
      {children}
      {options && (
        <dialog
          ref={dialog}
          className="info-dialog confirm-dialog"
          aria-labelledby="confirmation-title"
          aria-describedby="confirmation-message"
          onCancel={(event) => {
            event.preventDefault();
            finish(false);
          }}
        >
          <img src="/favicon.svg" alt="" width="32" height="32" />
          <h2 id="confirmation-title">{options.title}</h2>
          <p id="confirmation-message">{options.message}</p>
          <div className="dialog-actions">
            <button
              className="button secondary small"
              autoFocus
              onClick={() => finish(false)}
            >
              Cancel
            </button>
            <button className="button small" onClick={() => finish(true)}>
              {options.action}
            </button>
          </div>
        </dialog>
      )}
    </Context.Provider>
  );
}
