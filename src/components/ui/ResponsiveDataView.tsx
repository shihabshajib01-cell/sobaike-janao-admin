import React, {
  HTMLAttributes,
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/utils';

type ResponsiveDataMode = 'table' | 'cards';

interface ResponsiveDataContextValue {
  mode: ResponsiveDataMode;
  registerTableHost: (node: HTMLDivElement | null) => void;
  registerCardHost: (node: HTMLDivElement | null) => void;
}

const ResponsiveDataContext = createContext<ResponsiveDataContextValue | null>(null);

export interface ResponsiveDataViewProps extends HTMLAttributes<HTMLDivElement> {}

export const ResponsiveDataView: React.FC<ResponsiveDataViewProps> = ({
  className,
  children,
  ...props
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tableHostRef = useRef<HTMLDivElement | null>(null);
  const cardHostRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<ResponsiveDataMode>('table');

  const registerTableHost = useCallback((node: HTMLDivElement | null) => {
    tableHostRef.current = node;
  }, []);

  const registerCardHost = useCallback((node: HTMLDivElement | null) => {
    cardHostRef.current = node;
  }, []);

  const measure = useCallback(() => {
    const root = rootRef.current;
    const tableHost = tableHostRef.current;
    const cardHost = cardHostRef.current;
    const table = tableHost?.querySelector('table');

    if (!root || !tableHost || !cardHost || !table) {
      setMode('table');
      return;
    }

    const availableWidth = Math.floor(root.getBoundingClientRect().width);
    const requiredWidth = Math.ceil(table.scrollWidth);

    if (availableWidth <= 0 || requiredWidth <= 0) return;

    setMode(requiredWidth > availableWidth + 1 ? 'cards' : 'table');
  }, []);

  useLayoutEffect(() => {
    let frame = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };

    const root = rootRef.current;
    const tableHost = tableHostRef.current;
    const table = tableHost?.querySelector('table');

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleMeasure) : null;

    if (root) resizeObserver?.observe(root);
    if (tableHost) resizeObserver?.observe(tableHost);
    if (table) resizeObserver?.observe(table);

    const mutationObserver =
      tableHost && typeof MutationObserver !== 'undefined'
        ? new MutationObserver(scheduleMeasure)
        : null;

    mutationObserver?.observe(tableHost as Node, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
    };
  });

  return (
    <ResponsiveDataContext.Provider value={{ mode, registerTableHost, registerCardHost }}>
      <div
        ref={rootRef}
        data-mode={mode}
        className={cn('responsive-data-view relative w-full max-w-full min-w-0', className)}
        {...props}
      >
        {children}
      </div>
    </ResponsiveDataContext.Provider>
  );
};

export const ResponsiveDataTableView: React.FC<ResponsiveDataViewProps> = ({
  className,
  children,
  ...props
}) => {
  const context = useContext(ResponsiveDataContext);

  return (
    <div
      ref={context?.registerTableHost}
      aria-hidden={context?.mode === 'cards' ? true : undefined}
      className={cn('responsive-data-view__table w-full max-w-full min-w-0', className)}
      {...props}
    >
      {children}
    </div>
  );
};

export const ResponsiveDataCardView: React.FC<ResponsiveDataViewProps> = ({
  className,
  children,
  ...props
}) => {
  const context = useContext(ResponsiveDataContext);

  return (
    <div
      ref={context?.registerCardHost}
      aria-hidden={context?.mode === 'table' ? true : undefined}
      className={cn('responsive-data-view__cards w-full max-w-full min-w-0', className)}
      {...props}
    >
      {children}
    </div>
  );
};
