import {useCallback, useSyncExternalStore} from 'react';

/** Misma forma que el TOC de Docusaurus (árbol de encabezados). */
export type TocHeading = {
  value: string;
  id: string;
  level: number;
  children?: TocHeading[];
};

type Registrar = {
  register: (key: string, items: TocHeading[]) => void;
  unregister: (key: string) => void;
};

let sections: Record<string, TocHeading[]> = {};
let cachedMerged: TocHeading[] = [];
const listeners = new Set<() => void>();

function emit() {
  cachedMerged = Object.values(sections).flat();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): TocHeading[] {
  return cachedMerged;
}

export function useExtraDocTocRegistrar(): Registrar {
  const register = useCallback((key: string, items: TocHeading[]) => {
    sections = {...sections, [key]: items};
    emit();
  }, []);

  const unregister = useCallback((key: string) => {
    if (!(key in sections)) return;
    const next = {...sections};
    delete next[key];
    sections = next;
    emit();
  }, []);

  return {register, unregister};
}

/** TOC adicional registrado por componentes embebidos (FeaturedArticle, etc.). */
export function useExtraDocToc(): TocHeading[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Necesario para que Root.js pueda importarlo (aunque ya no usa un Provider). */
export function ExtraDocTocProvider({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
