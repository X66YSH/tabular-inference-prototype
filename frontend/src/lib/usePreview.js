import { useEffect, useMemo, useRef, useState } from "react";
import { previewDataset } from "./api";

// A small page cache avoids retaining a second copy of the complete dataset.
export default function usePreview(file, inspection, options) {
  const { offset, rowFilter = "all", targetColumn = "", rowIndices } = options;
  const filterTarget = rowFilter === "all" ? "" : targetColumn;
  const key = useMemo(() => JSON.stringify([offset, rowFilter, filterTarget, rowIndices ?? null]), [offset, rowFilter, filterTarget, rowIndices]);
  const cache = useRef({ file: null, pages: new Map() });
  const [state, setState] = useState({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!file || !inspection) {
      cache.current = { file: null, pages: new Map() };
      // Release the prior File and page when the external request input is reset.
      // oxlint-disable-next-line react/set-state-in-effect
      setState({});
      return;
    }
    if (cache.current.file !== file) {
      cache.current = { file, pages: new Map([[JSON.stringify([0, "all", "", null]), inspection.preview]]) };
    }
    const cached = cache.current.pages.get(key);
    if (cached) {
      setState({ file, key, data: cached, loading: false, error: "" });
      return;
    }
    const controller = new AbortController();
    setState({ file, key, data: null, loading: true, error: "" });
    previewDataset(file, { offset, rowFilter, targetColumn: filterTarget, rowIndices }, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const pages = cache.current.pages;
        pages.set(key, data);
        while (pages.size > 8) pages.delete(pages.keys().next().value);
        setState({ file, key, data, loading: false, error: "" });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ file, key, data: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [file, inspection, key, offset, rowFilter, filterTarget, rowIndices, attempt]);

  const current = state.file === file && state.key === key;
  return {
    preview: current ? state.data : null,
    loading: Boolean(file && inspection && (!current || state.loading)),
    error: current ? state.error : "",
    retry: () => setAttempt((value) => value + 1),
  };
}
