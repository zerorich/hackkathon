import { useCallback, useEffect, useRef, useState } from "react";

export function useApiData(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const seq = useRef(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const run = useCallback(({ silent = false } = {}) => {
    const current = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => {
        if (current === seq.current) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (current === seq.current) {
          setState((previous) =>
            silent && previous.data
              ? { ...previous, loading: false }
              : { data: null, loading: false, error }
          );
        }
      });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount/deps-change
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, reload: run };
}
