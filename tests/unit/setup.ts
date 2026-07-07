type Listener = (...args: unknown[]) => void;

export function makeChromeStub() {
  const data: Record<string, unknown> = {};
  const changeListeners: Listener[] = [];
  return {
    _data: data,
    _changeListeners: changeListeners,
    storage: {
      local: {
        get: async (keys?: string | string[] | null) => {
          if (keys == null) return { ...data };
          const names = typeof keys === 'string' ? [keys] : keys;
          return Object.fromEntries(names.filter((k) => k in data).map((k) => [k, data[k]]));
        },
        set: async (items: Record<string, unknown>) => {
          const changes = Object.fromEntries(
            Object.entries(items).map(([k, v]) => [k, { oldValue: data[k], newValue: v }]),
          );
          Object.assign(data, items);
          for (const l of changeListeners) l(changes, 'local');
        },
      },
      onChanged: { addListener: (l: Listener) => changeListeners.push(l) },
    },
    runtime: {
      sendMessage: async () => undefined,
      onMessage: { addListener: () => undefined },
    },
  };
}

globalThis.chrome = makeChromeStub() as unknown as typeof chrome;
