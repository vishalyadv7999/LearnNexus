import { useCallback, useEffect, useState } from "react";

const useInternshipResource = (loader) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setRequestVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const result = await loader();
        if (isActive) {
          setData(result);
        }
      } catch (loadError) {
        if (isActive) {
          setError(
            loadError.response?.data?.message ||
              "We couldn't load this preparation guide. Please try again."
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      isActive = false;
    };
  }, [loader, requestVersion]);

  return { data, error, isLoading, retry };
};

export default useInternshipResource;
