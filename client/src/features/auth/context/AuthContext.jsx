import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import {
  forgotPasswordRequest,
  loginRequest,
  logoutRequest,
  registerRequest,
  resetPasswordRequest,
  refreshSessionRequest,
  resendVerificationRequest,
  updatePreferences as updatePreferencesRequest,
  verifyRegistrationRequest,
} from "../api/auth";
import { clearToken, setToken } from "../../../utils/token";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authNotice, setAuthNotice] = useState("");

  useEffect(() => {
    let isActive = true;

    const restoreSession = async () => {
      try {
        const { data } = await refreshSessionRequest();
        if (!isActive) {
          return;
        }
        setToken(data.accessToken || data.token);
        setUser(data.user);
      } catch (_error) {
        if (!isActive) {
          return;
        }
        clearToken();
        setUser(null);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    restoreSession();

    const handleExpiry = (event) => {
      clearToken();
      setUser(null);
      setAuthNotice(
        event.detail?.message || "Session expired, please login again."
      );
    };

    window.addEventListener("learnnexus:auth-expired", handleExpiry);

    return () => {
      isActive = false;
      window.removeEventListener("learnnexus:auth-expired", handleExpiry);
    };
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await loginRequest(payload);
    setToken(data.accessToken || data.token);
    setUser(data.user);
    setAuthNotice("");
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const { data } = await registerRequest(payload);
    return data;
  }, []);

  const verifySignup = useCallback(async (payload) => {
    const { data } = await verifyRegistrationRequest(payload);
    setToken(data.accessToken || data.token);
    setUser(data.user);
    setAuthNotice("");
    return data.user;
  }, []);

  const forgotPassword = useCallback(async (payload) => {
    const { data } = await forgotPasswordRequest(payload);
    return data;
  }, []);

  const resetPassword = useCallback(async (payload) => {
    const { data } = await resetPasswordRequest(payload);
    clearToken();
    setUser(null);
    return data;
  }, []);

  const resendSignupCode = useCallback(async (payload) => {
    const { data } = await resendVerificationRequest(payload);
    return data;
  }, []);

  const updatePreferences = useCallback(async (payload) => {
    const { data } = await updatePreferencesRequest(payload);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch (_error) {
      // Local session cleanup still matters even if the request fails.
    } finally {
      clearToken();
      setUser(null);
      setAuthNotice("");
    }
  }, []);

  const consumeAuthNotice = useCallback(() => {
    const notice = authNotice;
    setAuthNotice("");
    return notice;
  }, [authNotice]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      signup,
      verifySignup,
      resendSignupCode,
      forgotPassword,
      resetPassword,
      updatePreferences,
      logout,
      authNotice,
      consumeAuthNotice,
    }),
    [
      authNotice,
      consumeAuthNotice,
      forgotPassword,
      isLoading,
      login,
      logout,
      resendSignupCode,
      resetPassword,
      signup,
      updatePreferences,
      user,
      verifySignup,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
